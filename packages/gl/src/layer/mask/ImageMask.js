import * as reshader from '@maptalks/reshader.gl';
import Mask from './Mask';

export default class ImageMask extends Mask {
    /**
     * @param  {Object} options.url   image resource url
     */
    constructor(coordinates, options) {
        super(coordinates, options);
        this._mode = 'texture';
    }
    
    setUrl(url) {
        this.options.url = url;
        const mesh = this._mesh;
        if (!mesh) {
            return;
        }
        if (mesh.material) {
            const maskTexture = mesh.material.get('maskTexture');
            if (maskTexture) {
                this._createTexture(maskTexture);
            }
        }
    }

    _createMesh(regl) {
        const geometry = this._createGeometry(regl);
        const mesh = new reshader.Mesh(geometry);
        const texture = regl.texture()
        this._createTexture(texture);
        mesh.material = new reshader.Material({ maskTexture: texture });
        this._setDefines(mesh);
        this._setLocalTransform(mesh);
        return mesh;
    }

    _updateUniforms(mesh) {
        const maskMode = this._getMaskMode();
        mesh.setUniform('maskMode', maskMode);
        const color = this._getMaskColor();
        mesh.setUniform('maskColor', color);
    }

    _setDefines(mesh) {
        const defines = mesh.getDefines();
        defines['HAS_TEXTURE'] = 1;
        mesh.setDefines(defines);
    }

    _createTexture(imageTexture) {
        const image = new Image()
        image.src = this.options.url;
        image.crossOrigin = 'anonymous';
        image.onload = function () {
            imageTexture(image);
        }
        image.onerror = function () {
            console.warn('Image load error');
        }
    }
}
