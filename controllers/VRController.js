class VRController {
    static index = async (req, res) => {
        try {
            res.render('VR/index', {

            });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    static startSegmentation = async (req, res) => {
        try {
            const { exec } = require('child_process');
            exec('yarn --cwd E:/nodejs_training/godashop/body_segmentation start', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${error.message}`);
                    return res.status(500).send('Error starting body segmentation');
                }
                if (stderr) {
                    console.error(`Stderr: ${stderr}`);
                }
                console.log(`Stdout: ${stdout}`);
            });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
}
module.exports = VRController;