import * as maptalks from 'maptalks';

//强制将maptalks any化,防止打包工具静态分析，fix report formatResourceUrl not exports

const MTK = maptalks.Util.extend({}, maptalks);
export function isImageBitMap(url) {
    return maptalks.Browser.imageBitMap && url instanceof ImageBitmap;
}

export function urlProxy(url: string) {
    if (url && MTK.formatResourceUrl) {
        const proxyUrl = MTK.formatResourceUrl(url);
        if (MTK.GlobalConfig && MTK.GlobalConfig.isTest) {
            console.log(`proxy resource url:${url},the proxyUrl:${proxyUrl}`);
        }
        return proxyUrl;
    }
    return url;
}

export const ResourceKeys = [
    'markerFile',
    'polygonPatternFile',
    'linePatternFile',
    'metallicRoughnessTexture',
    'bumpTexture',
    'noiseTexture',
    'occlusionTexture',
    'texWaveNormal',
    'texWavePerturbation',
    'baseColorTexture',
    'normalTexture',
    'emissiveTexture',
    //other reousrce keys

];

export const styleResourceProxy = (style) => {
    if (MTK.Util.isObject(style)) {
        for (const key in style) {
            const value = style[key];
            if (MTK.Util.isObject(value)) {
                styleResourceProxy(value);
            } if (Array.isArray(value)) {
                styleResourceProxy(value);
            } else {
                if (value && ResourceKeys.indexOf(key) > -1) {
                    style[key] = urlProxy(value);
                }
            }
        }
    } else if (Array.isArray(style)) {
        style.forEach(d => {
            styleResourceProxy(d);
        });
    }
}