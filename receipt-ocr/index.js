const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const preprocess = require('./preprocess');
const ocr = require('./parsing/ocr');
const ptext = require('./parsing/text');
const io = require('./io');
const debug = require('debug')('receipt-ocr');

function main() {
  const inputDir = path.join(__dirname, 'images', 'input');
  const isValidFile = _.flow(
    f => path.parse(f),
    parts => parts.ext,
    _.toLower,
    _.partial(_.includes, ['.png', '.jpg', '.jpeg'])
  );

  fs.readdirAsync(inputDir)
    .filter(isValidFile)
    .map(filename => {
      debug(`Preparing to parse ${filename}`);
      const imageName = path.parse(filename).name;
      const imagePath = path.join(inputDir, filename);
      const writeRawText = _.partial(writeTextToFile, `${imageName}.txt`);
      const writeJsonText = _.partial(writeTextToFile, `${imageName}.txt`);

      return parseImage(imagePath)
        .tap(debug)
        .tap(text => ptext.parse(text).then(writeJsonText))
        .then(writeRawText);
    });
}

function parseImage(imagePath) {
  debug(`Input ImagePath: ${imagePath}`);
  const imagePathData = path.parse(imagePath);

  const tempImageDir = path.join(__dirname, 'images', 'output');
  const tempImagePath = path.join(tempImageDir, `${imagePathData.name}${imagePathData.ext}`);

  return io.ensureExists(tempImageDir)
    .then(() => preprocess.clean(imagePath, tempImagePath))
    .then(() => ocr.extractText(tempImagePath));
}

function writeTextToFile(filename, text) {
  const outputDir = path.join(__dirname, 'text');
  const outputPath = path.join(outputDir, filename);
  return io.ensureExists(outputDir)
    .then(() => fs.writeFileAsync(outputPath, text));
}


main();
