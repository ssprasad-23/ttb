import './style.css'
import setupUploader from './components/Uploader.js'

document.querySelector('#app').innerHTML = `<div id="uploader"></div>`

setupUploader(document.querySelector('#uploader'))