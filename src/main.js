import './style.css'
import { setupUploader } from './uploader.js'

document.querySelector('#app').innerHTML = `<div id="uploader"></div>`

setupUploader(document.querySelector('#uploader'))