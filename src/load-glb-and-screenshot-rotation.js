module.exports = (page, {glbPath, outputPath, format, quality, timeout, rotations}) => {
  return page.evaluate((browser_glbPath, browser_outputPath, browser_format, browser_quality, timeout) => {
    return new Promise((resolve, reject) => {
      var startTime = Number(new Date());
      var endTime = startTime + timeout;
      const isTimedOut = function() {
        const currentTime = Number(new Date());
        if (currentTime < endTime) {
          window.logInfo(`--- Waited ${currentTime - startTime}ms for model to render. ${endTime - currentTime}ms left until timeout.`);
        } else {
          reject('Waited until timeout');
        }
      }
      
      modelViewer = document.getElementById('snapshot-viewer');
      timeoutSet = setInterval(isTimedOut, 1000);
      
      let currentRotationIndex = 0;
      let screenshots = [];
      const totalRotations = 15;


      
      const takeScreenshot = () => {
         console.error("take")  
        if (currentRotationIndex >= totalRotations) {
          clearTimeout(timeoutSet);
          createCompositeImage();
          return;
        }

        const theta = (360 / totalRotations) * currentRotationIndex;
        modelViewer.cameraOrbit = `${theta}deg 75deg 100%`;        


      
        setTimeout(() => {
          let t0 = Number(new Date());
          const dataUrl = modelViewer.toDataURL(browser_format, browser_quality);
          screenshots.push(dataUrl);
          let t1 = Number(new Date());
          window.logInfo(`--- Waited ${t1 - t0}ms for toDataURL to finish for rotation ${currentRotationIndex}.`);
          
          currentRotationIndex++;
          takeScreenshot();
        }, 1000);
      };
      
      const createCompositeImage = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const imageSize = 360; // Adjust this value based on your needs


        canvas.width = imageSize * totalRotations;
        canvas.height = imageSize;        
        const loadImage = (src) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        };
        
        Promise.all(screenshots.map(loadImage))
          .then(images => {
            images.forEach((img, index) => {
              ctx.drawImage(img, index * imageSize, 0, imageSize, imageSize);
            });            
            const compositeDataUrl = canvas.toDataURL(browser_format, browser_quality);
            window.saveDataUrl(
              compositeDataUrl,
              browser_outputPath,
            );

            resolve("Success");
          })
          .catch(error => {
            reject(`Error creating composite image: ${error}`);
          });
      };
      
      modelViewer.addEventListener('model-visibility', function(event){
        try {
          const visible = event.detail.visible;
          if(visible){
            takeScreenshot();
          }
        } catch(err) {
          reject(err);
        }
      });
      
      modelViewer.src = browser_glbPath;
    });
  }, glbPath, outputPath, format, quality, timeout);
}
