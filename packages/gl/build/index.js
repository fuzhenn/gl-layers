import createREGL from '@maptalks/regl';
import * as reshader from '@maptalks/reshader.gl';

export {
    glMatrix,
    mat2, mat2d, mat3, mat4,
    quat, quat2,
    vec2, vec3, vec4,
} from '@maptalks/reshader.gl';
export { createREGL, reshader };

export * from './gl/gl.es.js';
import transcoders, { registerGLTFLoaderBundle } from '../src/transcoders';

import { gltfLoaderExport } from  './gltf-loader-bundle.js';
registerGLTFLoaderBundle(gltfLoaderExport);
export { transcoders };

import * as maptalks from 'maptalks';
import chunk from './worker.js';
maptalks.registerWorkerAdapter('@maptalks/terrain', chunk);
