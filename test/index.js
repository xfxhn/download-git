const Download = require('./../download');

const download = new Download({
    pathUrl: './xf'
});
download.download('https://github.com/xfxhn/httpServer/tree/master/template');
