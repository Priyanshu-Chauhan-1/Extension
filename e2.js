document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extractBtn');
  const copyAltTextBtn = document.getElementById('copyAltTextBtn');
  const resultDiv = document.getElementById('result');
  let currentAltTexts = []; // Store alt texts from last extraction

  extractBtn.addEventListener('click', () => {
    resultDiv.textContent = 'Extracting alt texts and image URLs...';
    currentAltTexts = [];

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          function extractFromDoc(doc) {
            const imgs = Array.from(doc.querySelectorAll('img'));
            return imgs.map(img => ({
              alt: img.alt || '(no alt text)',
              src: img.src || '(no src)'
            }));
          }

          function extractFromAllFrames(doc = document) {
            let results = extractFromDoc(doc);
            const iframes = Array.from(doc.querySelectorAll('iframe'));
            for (const iframe of iframes) {
              try {
                if (iframe.contentDocument) {
                  results = results.concat(extractFromAllFrames(iframe.contentDocument));
                }
              } catch (e) {
                // Cross-origin iframe, ignore
              }
            }
            return results;
          }

          return extractFromAllFrames();
        }
      }, (results) => {
        if (chrome.runtime.lastError) {
          resultDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
          return;
        }
        if (!results || !results[0] || results[0].result.length === 0) {
          resultDiv.textContent = 'No images found on this page.';
          return;
        }

        const images = results[0].result;
        currentAltTexts = images.map(item => item.alt || '(no alt text)');

        // Build HTML table string with column width styling
        let html = `<p>Total images: ${images.length}</p>`;
        html += `<table border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; width: 100%;">`;
        html += `<colgroup>
                   <col style="width: 5%">
                   <col style="width: 30%; max-width: 250px; overflow-wrap: break-word;">
                   <col style="width: 65%; max-width: 450px; overflow-wrap: break-word;">
                 </colgroup>`;
        html += `<thead><tr><th>#</th><th>Image URL</th><th>Alt Text</th></tr></thead><tbody>`;

        images.forEach((item, index) => {
          const srcEsc = item.src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const altEsc = item.alt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          html += `<tr>
                     <td>${index + 1}</td>
                     <td style="word-break: break-all; max-width: 250px;">
                       <a href="${srcEsc}" target="_blank" rel="noopener noreferrer">${srcEsc}</a>
                     </td>
                     <td style="word-break: break-word; max-width: 450px;">${altEsc}</td>
                   </tr>`;
        });

        html += `</tbody></table>`;

        resultDiv.innerHTML = html;
      });
    });
  });

  copyAltTextBtn.addEventListener('click', () => {
    if (currentAltTexts.length === 0) {
      alert('No alt texts to copy. Please extract first.');
      return;
    }
    const allAltTextStr = currentAltTexts.join('\n');
    navigator.clipboard.writeText(allAltTextStr).then(() => {
      alert('All alt texts copied to clipboard!');
    }).catch(err => {
      alert('Failed to copy alt texts: ' + err);
    });
  });
});
