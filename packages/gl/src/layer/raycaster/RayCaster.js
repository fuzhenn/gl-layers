import { vec2, vec3, vec4, mat4 } from '@maptalks/reshader.gl';
import { Coordinate, Point, Util } from 'maptalks';
import Ray from './Ray';

const TRIANGLE = [], LINE = [], VEC3 = [], POS_A = [], POS_B = [], POS_C = [], TEMP_POINT = new Point(0, 0), NULL_ALTITUDES = [];
const TEMP_VEC_AB = [], TEMP_VEC_AC = [];
const EMPTY_MAT = [];
const pA_VEC = [], pB_VEC = [], pC_VEC = [];
const INTERSECT_POINT = [];
export default class RayCaster {
    constructor(from, to, options = {}) {
        this.ray = new Ray(from, to);
        this.setFromPoint(from);
        this.setToPoint(to);
        this._options = options;
        this._intersectCache = {};
        this._version = 0;
    }

    setFromPoint(from) {
        this.ray.setFromPoint(from);
        this._from = this._adaptCoordinate(from);
        this._incrVersion();
    }

    setToPoint(to) {
        this.ray.setToPoint(to);
        this._to = this._adaptCoordinate(to);
        this._incrVersion();
    }

    setOptions(options) {
        this._options = options;
    }

    _incrVersion() {
        this._intersectCache = {};
        this._version++;
    }

    test(meshes, map) {
        const results = [];
        for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            const key = mesh.uuid + '-' + mesh.version + '-' + mesh.geometry.version + '-' + this._version;
            if (this._intersectCache[key]) {
                results.push(this._intersectCache[key]);
                continue;
            }
            if (!this._checkBBox(mesh.getBoundingBox(), map)) {
                continue;
            }
            const localTransform = mesh.localTransform;
            const geometry = mesh.geometry;
            const positions = geometry.data[geometry.desc.positionAttribute].array;
            const altitudes = (geometry.data[geometry.desc.altitudeAttribute] && geometry.data[geometry.desc.altitudeAttribute].array) || NULL_ALTITUDES;
            const geoIndices = geometry.indices;
            if (!positions || !geoIndices) {
                console.log(2);
                // console.warn('there are no POSITION or inidces in mesh');
                continue;
            }
            const matrix = mat4.multiply(EMPTY_MAT, localTransform, mesh.positionMatrix);
            const coordinates = this._testMesh(mesh, map, positions, altitudes, geoIndices, geometry.desc.positionSize, matrix);
            if (coordinates) {
                // const { coordinate, indices } = intersect;
                const result = {
                    mesh,
                    coordinates
                };
                results.push(result);
                this._intersectCache[key] = result;
            }
        }
        return results;
    }

    _testMesh(mesh, map, positions, altitudes, indices, positionSize, matrix) {
        const from = coordinateToWorld(map, this._from.x, this._from.y, this._from.z);
        const to = coordinateToWorld(map, this._to.x, this._to.y, this._to.z);
        const line = vec2.set(LINE, from, to);
        const coordinates = [];
        for (let j = 0; j < indices.length; j += 3) {
            if (j > mesh.properties.skirtOffset) {
                break;
            }
            const a = indices[j];
            const b = indices[j + 1];
            const c = indices[j + 2];
            const positionsA = vec3.set(pA_VEC, positions[a * positionSize], positions[a * positionSize + 1], positions[a * positionSize + 2]);
            const pA = this._toWorldPosition(POS_A, map, positionsA, altitudes[a] / 100, matrix);
            const positionsB = vec3.set(pB_VEC, positions[b * positionSize], positions[b * positionSize + 1], positions[b * positionSize + 2]);
            const pB = this._toWorldPosition(POS_B, map, positionsB, altitudes[b] / 100, matrix);
            const positionsC = vec3.set(pC_VEC, positions[c * positionSize], positions[c * positionSize + 1], positions[c * positionSize + 2]);
            const pC = this._toWorldPosition(POS_C, map, positionsC, altitudes[c] / 100, matrix);

            const triangle = vec3.set(TRIANGLE, pA, pB, pC);
            const vAB = vec3.sub(TEMP_VEC_AB, pA, pB);
            const vAC = vec3.sub(TEMP_VEC_AC, pA, pC);
            const intersectPoint = this._testIntersection(INTERSECT_POINT, triangle, line);
            if (intersectPoint) {
                if (!intersectPoint[0] || !intersectPoint[1]) {
                    continue;
                }
                const altitude = map.pointAtResToAltitude(intersectPoint[2], map.getGLRes());
                TEMP_POINT.x = intersectPoint[0];
                TEMP_POINT.y = intersectPoint[1];
                const coord = map.pointAtResToCoordinate(TEMP_POINT, map.getGLRes());
                coord.z = altitude;
                coordinates.push({
                    coordinate: coord,
                    indices: [a, b, c],
                    normal: vec3.cross([], vAB, vAC)
                });
            }
        }
        return coordinates.length ? coordinates : null;
    }

    _toWorldPosition(out, map, pos, altitude, matrix) {
        let alt;
        if (Util.isNumber(altitude)) {
            alt = map.altitudeToPoint(altitude, map.getGLRes());
            vec4.set(out, pos[0], pos[1], 0, 1);
            vec4.transformMat4(out, out, matrix);
            out[2] = alt;
        } else {
            vec4.set(out, pos[0], pos[1], pos[2], 1);
            vec4.transformMat4(out, out, matrix);
        }
        return out;
    }

    _testIntersection(out, triangle, line) {
        const ray = new Ray(line[0], line[1]);
        return ray.intersectTriangle(triangle[0], triangle[1], triangle[2], null, out);
    }

    _isPointOnLine(line, point) {
        const tolerance = this._options['tolerance'] || 1;
        const p0 = line[0], p1 = line[1], p = point;
        const lengthp0p1 = vec3.length(vec3.sub(VEC3, p0, p1));
        const lengthp0p = vec3.length(vec3.sub(VEC3, p0, p));
        const lengthp1p = vec3.length(vec3.sub(VEC3, p1, p));
        if (Math.abs(lengthp0p + lengthp1p - lengthp0p1) > tolerance) {
            return false;
        }
        return true;
    }

    _adaptCoordinate(coord) {
        if (coord instanceof Coordinate) {
            return coord;
        } else if (Array.isArray(coord)) {
            return new Coordinate(coord);
        }
        return null;
    }

    _checkBBox(bbox, map) {
        const from = coordinateToWorld(map, this._from.x, this._from.y, this._from.z);
        const to = coordinateToWorld(map, this._to.x, this._to.y, this._to.z);
        const ray = new Ray(from, to);
        return ray.intersectBox({ min: bbox[0], max: bbox[1] }, []);
        // const line = [from, to];
        // const min = bbox[0], max = bbox[1];
        // for (let i = 0; i < CUBE_POSITIONS.length; i += 3) {
        //     for (let j  = 0; j < 3; j++) {
        //         const index = i + j;
        //         if (CUBE_POSITIONS[index] > 0) {
        //             BBOX_POSITIONS[index] = max[j];
        //         } else {
        //             BBOX_POSITIONS[index] = min[j];
        //         }
        //     }
        // }
        // for (let j = 0; j < CUBE_INDICES.length; j += 3) {
        //     const a = CUBE_INDICES[j];
        //     const b = CUBE_INDICES[j + 1];
        //     const c = CUBE_INDICES[j + 2];
        //     const pA = vec3.set(pA_VEC, BBOX_POSITIONS[a * 3], BBOX_POSITIONS[a * 3 + 1], BBOX_POSITIONS[a * 3 + 2])
        //     const pB = vec3.set(pB_VEC, BBOX_POSITIONS[b * 3], BBOX_POSITIONS[b * 3 + 1], BBOX_POSITIONS[b * 3 + 2])
        //     const pC = vec3.set(pC_VEC, BBOX_POSITIONS[c * 3], BBOX_POSITIONS[c * 3 + 1], BBOX_POSITIONS[c * 3 + 2])
        //     const triangle = vec3.set(TRIANGLE, pA, pB, pC);
        //     const intersectPoint = this._testIntersection(INTERSECT_POINT, triangle, line);
        //     if (intersectPoint) {
        //         return true;
        //     }
        // }
        // return false;
    }
}

const COORD = new Coordinate(0, 0);

function coordinateToWorld(map, x, y, z) {
    if (!map) {
        return null;
    }
    COORD.set(x, y);
    const p = map.coordinateToPointAtRes(COORD, map.getGLRes());
    const height = map.altitudeToPoint(z || 0, map.getGLRes());
    return [p.x, p.y, height];
}

function minValue(A, B, C, axis) {
    let min = A[axis];
    if (min > B[axis]) {
        min = B[axis];
    }
    if (min > C[axis]) {
        min = C[axis];
    }
    return min;
}

function maxValue(A, B, C, axis) {
    let max = A[axis];
    if (max < B[axis]) {
        max = B[axis];
    }
    if (max < C[axis]) {
        max = C[axis];
    }
    return max;
}
