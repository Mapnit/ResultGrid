var appConfig = {
	columnTemplates: [
		{
			"name": "URL",
			"content-type": "url"
		}, {
			"name": "INTERACTIVE_MAP_URL",
			"content-type": "url"
		}, {
			"name": "FINS_URL",
			"content-type": "url"
		}, {
			"name": "SCOUT_TAG",
			"content-type": "a_tag"
		}, {
			"name": "DHUB_URL",
			"content-type": "url"
		}, {
			"name": "DHUB_TAG",
			"content-type": "a_tag"
		}
	], 
    searchTargets: [
        {
            "name": "Equipment",
			"default": true, 
            "queries": [
                {
                    "name": "Equipment",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/34",
                    "where": "(upper(description) like '{0}%' or equipmentnumber like '%{0}%' or systemxref like '{0}%')"
                },
                {
                    "name": "Functional Locations",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/53",
                    "where": "(upper(description) like '{0}%' or funcloc like '{0}%' or systemxref like '{0}%')"
                }
            ]
        },
        {
            "name": "Land",
			"default": true, 
            "queries": [
                {
                    "name": "Active Contracts",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/9",
                    "where": "(LESSEE_GRANTEE like '{0}%'or AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Inactive Contracts",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/51",
                    "where": "(LESSEE_GRANTEE like '{0}%' or AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Active International Contracts",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/17",
                    "where": "(LESSEE_GRANTEE like '{0}%' or ARRG_TYPE_CODE like '{0}%' or upper(AGMT_TYPE_DESCR) like '{0}%' or AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Inactive International Contracts",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/21",
                    "where": "(LESSEE_GRANTEE like '{0}%' or AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Active Fee Property",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/10",
                    "where": "(AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Inactive Fee Property",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/29",
                    "where": "(AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Active Granted Leases",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/28",
                    "where": "(LESSEE_GRANTEE like '{0}%' or AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Inactive Granted Leases",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/27",
                    "where": "(LESSEE_GRANTEE like '{0}%' or AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Active Hard Rock Mineral Leases",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/55",
                    "where": "(AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Inactive Hard Rock Mineral Leases",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/56",
                    "where": "(AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Active Leases",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/12",
                    "where": "(AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Inactive Leases",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/30",
                    "where": "(AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Active International Leases",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/13",
                    "where": "(AGMT_NAME like '{0}%' or ARRG_TYPE_CODE like '{0}%' or AGMT_TYPE_DESCR like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Inactive International Leases",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/16",
                    "where": "(AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Active ORI Leases",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/15",
                    "where": "(AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Inactive ORI Leases",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/31",
                    "where": "(AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Active Surface/ROW",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/20",
                    "where": "(LESSEE_GRANTEE like '{0}%' or AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Inactive Surface/ROW",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/57",
                    "where": "(LESSEE_GRANTEE like '{0}%' or AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "Active Title Opinions",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/49",
                    "where": "(AGMT_NAME like '{0}%')",
                    "numericWhere": "(ARRG_KEY = {0} or AGMT_NUM = '{0}')"
                },
                {
                    "name": "International Contracts (Enerdeq)",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/36",
                    "where": "(upper(parent_participants) like '{0}%' or upper(shareholder_participants) like '{0}%')"
                },
                {
                    "name": "Interim Leases",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/50",
                    "where": "(QLA_ID like '{0}%')"
                },
                {
                    "name": "QLA Projects",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/59",
                    "where": "(PROJ_ID like '{0}%')"
                }
            ]
        },
        {
            "name": "Landgrid",
			"default": true, 
            "queries": [
                {
                    "name": "Tobin TX Abstracts",
                    "serviceUrl": "http://gis/ArcGIS/rest/services/Basemap/basemap_query/MapServer/23",
                    "where": "('A-' || abstract like upper('{0}') or abstract = '{0}')"
                },
                {
                    "name": "Tobin TX Blocks",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/41",
                    "where": "(blk like '{0}')"
                },
                {
                    "name": "Tobin TX Sections",
                    "serviceUrl": "http://gis/ArcGIS/rest/services/Basemap/basemap_query/MapServer/42",
                    "where": "(sect like '{0}')"
                },
                {
                    "name": "Townships",
                    "serviceUrl": "http://gis/ArcGIS/rest/services/Basemap/basemap_query/MapServer/11",
                    "where": "(twp||tdir||' '||rng||rdir like '{0}' or mtr like '{0}')"
                },
                {
                    "name": "Ownership Parcels",
                    "serviceUrl": "http://gis/ArcGIS/rest/services/Basemap/basemap_query/MapServer/47",
                    "where": "(apn like '{0}%')"
                },
                {
                    "name": "Counties",
                    "serviceUrl": "http://gis/ArcGIS/rest/services/Basemap/basemap_query/MapServer/8",
                    "where": "(upper(cty_name) like '{0}%')"
                },
                {
                    "name": "Tobin Districts",
                    "serviceUrl": "http://gis/ArcGIS/rest/services/Basemap/basemap_query/MapServer/43",
                    "where": "(dist_code like '{0}' or county_name like '{0}' or name like '{0}')"
                },
                {
                    "name": "Ohio Townships",
                    "serviceUrl": "http://gis/ArcGIS/rest/services/Basemap/basemap_query/MapServer/45",
                    "where": "(ohio_tname like '{0}')"
                },
                {
                    "name": "TX Rural Subdivisions",
                    "serviceUrl": "http://gis/ArcGIS/rest/services/Basemap/basemap_query/MapServer/52",
                    "where": "(tract_id like '{0}%' or subd_tobin like '{0}%' or sub_id like '{0}%')"
                }
            ]
        },
        {
            "name": "Location",
			"default": true, 
            "queries": [
                {
                    "name": "APC Office Locations",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/22",
                    "where": "(upper(descr) like '{0}%')"
                }
            ]
        },
        {
            "name": "Pipeline",
			"default": true, 
            "queries": [
                {
                    "name": "Pipeline Centerlines",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/33",
                    "where": "(line_id like '{0}%' or line_designator like '{0}%' or line_description like '{0}%')"
                },
                {
                    "name": "Pipeline Product Type",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/5",
                    "where": "(line_name like '{0}' or product_type_scl like '{0}')"
                },
                {
                    "name": "Pipeline Status Range",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/6",
                    "where": "(line_name like '{0}' or operating_status_gcl like '{0}')"
                },
                {
                    "name": "Industry Pipeline",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/3",
                    "where": "(owner like '{0}%' or operator like '{0}%')"
                }
            ]
        },
        {
            "name": "Geophysics_Seismic",
			"default": true, 
            "queries": [
                {
                    "name": "2D Seismic GSL",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/37",
                    "where": "(survey like '{0}%' or line_name like '{0}%' or vendor like '{0}%' or obtainfrom like '{0}%' or dataowner like '{0}%')"
                },
                {
                    "name": "3D Seismic GSL",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/38",
                    "where": "(survey like '{0}%' or vendor like '{0}%')"
                },
                {
                    "name": "3D Seismic INTL APC",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/19",
                    "where": "(line_name like '{0}%' or prospect_name like '{0}%' or alias_ids like '{0}%')"
                },
                {
                    "name": "3D Seismic Domestic APC",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/14",
                    "where": "(line_name like '{0}%' or prospect_name like '{0}%' or alias_ids like '{0}%')"
                },
                {
                    "name": "2D Seismic INTL APC",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/18",
                    "where": "(line_name like '{0}%' or prospect_name like '{0}%' or alias_ids like '{0}%')"
                },
                {
                    "name": "2D Seismic Domestic APC",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/7",
                    "where": "(line_name like '{0}%' or prospect_name like '{0}%' or alias_ids like '{0}%')"
                }
            ]
        },
        {
            "name": "Wells",
			"default": true, 
            "queries": [
                {
                    "name": "APC Wells",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/0",
                    "where": "(well_no like '{0}%' or cmpl_name like '{0}%' or well_name like '{0}%' or api_uwi_no like '{0}' or upper(pad_group_name) like '{0}%' or upper(pod_group_name) like '{0}%' or route_description like '{0}%')"
                },
                {
                    "name": "APC Producing Wells",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/1",
                    "where": "(well_num like '{0}%' or cmpl_name like '{0}%' or api_num like '{0}' or pumper_name like '{0}%' or forman_name like '{0}%')"
                },
                {
                    "name": "Industry Wells",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/2",
                    "where": "(uwi like '{0}%' or wellbore_id like '{0}%' or WINS like '{0}' or auwi like '{0}' or current_well_name like '{0}%' or alt_well_name like '{0}%' or current_operator_name like '{0}%')"
                }
            ]
        },
        {
            "name": "Other",
			"default": true, 
            "queries": [
                {
                    "name": "Regulatory Projects",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/44",
                    "where": "(p_code like '{0}%' or f_id like '{0}%' or upper(f_name) like '{0}%')"
                },
                {
                    "name": "Probe Basins",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/24",
                    "where": "(upper(name) like '{0}%')"
                },
                {
                    "name": "AAPG Basins",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/25",
                    "where": "(basin like '{0}%')"
                },
                {
                    "name": "Global Fields",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/26",
                    "where": "(field_name like '{0}%' or apc_field_id = '{0}')"
                },
                {
                    "name": "Depletion Units",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/32",
                    "where": "(DEPLETION_UNIT_CODE = '{0}' or DEPLETION_UNIT_NAME like '{0}%')"
                },
                {
                    "name": "Legal Descriptions",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/2",
                    "where": "(surface_location_legal_desc like '{0}')"
                },
                {
                    "name": "Offshore Vessels",
                    "serviceUrl": "http://gis/arcgis/rest/services/Basemap/basemap_query/MapServer/40",
                    "where": "(vessel like '{0}' or mmsi like '{0}')"
                }
            ]
        },
        {
            "name": "Addresses",
			"default": false, 
            "queries": [
                {
                    "name": "Address",
                    "BingMapKey": "AucS13UKT6Z3vdopT191o2GIGUcyZ5rnO5cvdY_Py01vancFOkFezw7K7XGeA8or."
                }
            ]
        }
    ]
}; 

