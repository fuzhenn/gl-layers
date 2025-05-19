import MultiGLTFMarker from "./MultiGLTFMarker";
import { Coordinate, Util } from "maptalks";
import { vec3 } from '@maptalks/gl';

const options = {
    direction: 0, //指定模型拉伸方向, 0, 1, 2分别代表x,y,z轴
    gapLength: 0,
    scaleVertex: true
};

const TEMP_COORD = new Coordinate(0, 0);

export default class GLTFLineString extends MultiGLTFMarker {
    constructor(coordinates, options) {
        super(null, options);
        this.on('load', () => {
            this.setCoordinates(coordinates);
        });
    }

    static fromJSON(json) {
        return new GLTFLineString(json.data, json.options);
    }

    setCoordinates(coordinates) {
        this._coordinates = coordinates;
        this._updateData();
    }

    getCoordinates() {
        return this._coordinates;
    }

    toJSON() {
        const json = JSON.parse(JSON.stringify({
            coordinates : this._coordinates,
            options: this.options,
            type: 'GLTFLineString'
        }));
        const id = this.getId();
        if (!Util.isNil(id)) {
            json.options['id'] = id;
        }
        const properties = this.getProperties();
        if (json.options) {
            json.options['properties'] = properties;
        }
        return json;
    }

    _updateData() {
        const coordinates = this._coordinates;
        if (!coordinates) {
            return;
        }
        this.removeAllData();
        const map = this.getMap();
        const scale = this._calGLTFScale();
        for (let i = 0; i < coordinates.length - 1; i++) {
            const from = this._toCoordinate(coordinates[i]), to = this._toCoordinate(coordinates[i + 1]);
            const projectionScale = this._calProjectionScale(from, to);
            const dataArr = this.gltfPack.arrangeAlongLine(map, from, to, scale, projectionScale, this.options);
            dataArr.forEach(item => {
                this.addData(item);
            });
        }
        this._dirty = true;
    }

    _calGLTFScale() {
        const scale = [1, 1, 1];
        const modelHeight = this.getModelHeight();
        if (modelHeight) {
            this._calModelHeightScale(scale, modelHeight);
        } else {
            const symbol = this.getSymbol();
            vec3.set(scale, symbol.scaleX || 1, symbol.scaleY || 1, symbol.scaleZ || 1);
        }
        return scale;
    }

    _calProjectionScale(from, to) {
        const map = this.getMap();
        const glRes = map.getGLRes();
        TEMP_COORD.set(0, (from.y + to.y) / 2);
        const ratio = map.altitudeToPoint(100, glRes, TEMP_COORD) / map.altitudeToPoint(100, glRes);
        return ratio;
    }

    _toCoordinate(coord) {
        if (Array.isArray(coord)) {
            return new Coordinate(coord);
        }
        return coord;
    }
}

GLTFLineString.mergeOptions(options);
GLTFLineString.registerJSONType('GLTFLineString');
