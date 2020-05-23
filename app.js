const fs = require('fs')
const path = require('path')
const PromisePool = require('@supercharge/promise-pool')
const exif = require('jpeg-exif')
const sharp = require('sharp')

const files = getAllFileList('./data/', /\.jpe?g$/)

PromisePool.for(files)
  .withConcurrency(20)
  .process(async (filePath) => {
    let exifData = {}

    try {
      exifData = exif.parseSync(filePath)
    } catch {
      //
    }

    if (!exifData.GPSInfo) throw new Error(`GPSInfo not found in file: ${filePath}`)

    const fileName = path.basename(filePath)
    const smallFilepath = `./data/small_${fileName}`
    const mediumFilepath = `./data/medium_${fileName}`
    const jpegOptions = { quality: 80, chromaSubsampling: '4:4:4' }
    const latlng = [
      convert(...exifData.GPSInfo.GPSLatitude, exifData.GPSInfo.GPSLatitudeRef),
      convert(...exifData.GPSInfo.GPSLongitude, exifData.GPSInfo.GPSLongitudeRef),
    ]

    if (!fs.existsSync(smallFilepath)) {
      sharp(filePath, { failOnError: false })
        .resize(200)
        .rotate()
        .jpeg(jpegOptions)
        .toFile(smallFilepath)
        .catch(console.error)
    }

    if (!fs.existsSync(mediumFilepath)) {
      sharp(filePath, { failOnError: false })
        .resize(800)
        .rotate()
        .jpeg(jpegOptions)
        .toFile(mediumFilepath)
        .catch(console.error)
    }

    return {
      ...exifData.GPSInfo,
      fileName,
      latlng,
    }
  })
  .then(({ errors, results }) => {
    if (errors.length) {
      console.error('errors', errors.length)
    }
    console.log('results', results.length)
    fs.writeFileSync('./data/data.json', JSON.stringify(results))
  })

function getAllFileList(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const fileStat = fs.lstatSync(filePath)

    if (fileStat.isDirectory()) {
      getAllFileList(filePath, filter, fileList)
    } else if (filter.test(filePath)) {
      fileList.push(filePath)
    }
  })

  return fileList
}

function convert(degrees, minutes, seconds, direction) {
  var dd = degrees + minutes / 60 + seconds / (60 * 60)

  if (direction === 'S' || direction === 'W') {
    dd = dd * -1
  }

  return dd
}
