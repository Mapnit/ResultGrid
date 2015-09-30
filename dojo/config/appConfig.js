var appConfig = {
	searchTargets: [{
		"name": "Census2000",
		"default": true,
		"queries": [{
			"name": "Block Points",
			"serviceUrl": "http://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer/0",
			"where": "STATE_FIPS = '01' and BLOCK like '%{0}%'"
		}, {
			"name": "Block Groups",
			"serviceUrl": "http://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer/1",
			"where": "STATE_FIPS = '01' and TRACT like '%{0}%'",
			"numericWhere": "HOUSEHOLDS > {0}"
		}, {
			"name": "Counties",
			"serviceUrl": "http://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer/2",
			"where": "upper(name) like '%{0}%'",
			"numericWhere": "STATE_FIPS = '01' and CNTY_FIPS like '%{0}%'"
		}]
	}, {
		"name": "US Cities",
		"default": false,
		"queries": [{
			"name": "Cities",
			"serviceUrl": "http://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer/0",
			"where": "upper(areaname) like '%{0}%'"
		}]
	}, {
		"name": "Others",
		"default": false,
		"queries": null
	}
]
}; 

