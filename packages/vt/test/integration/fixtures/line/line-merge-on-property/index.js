const data = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [13.41706531630723, 52.529564627058534],
                    [13.417135053741617, 52.52956625878565],
                    [13.417226248848124, 52.52954504632825],
                ]
            },
            properties: {
                ref: 1
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [13.417226248848124, 52.52954504632825],
                    [13.417290621864481, 52.52956625878565],
                    [13.417635229170008, 52.529564137540376]
                ]
            },
            properties: {
                ref: 1
            }
        }
    ]
};

const style = [
    {
        filter: true,
        renderPlugin: {
            type: 'line',
            dataConfig: {
                type: 'line'
            },
            sceneConfig: {
                // excludes : ['!has', 'levels']
            }
        },
        symbol: {
            lineOpacity: 1,
            lineWidth: 8,
            lineColor: '#f00',
            mergeOnProperty: 'ref'
        }
    }
];

module.exports = {
    style,
    data,
    view: {
        center: [13.417215439878191, 52.52954768307015],
        zoom: 19,
        bearing: 90
    }
};
