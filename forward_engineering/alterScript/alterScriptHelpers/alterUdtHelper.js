const { AlterScriptDto } = require('../types/AlterScriptDto');

/**
 * @return { (jsonSchema: Object) => AlterScriptDto }
 * */
const getCreateUdtScriptDto =
	({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }) =>
	jsonSchema => {
		const _ = app.require('lodash');
		const { createColumnDefinitionBySchema } = require('./createColumnDefinition')(app);
		const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);
		const { getDefinitionByReference } = app.require('@hackolade/ddl-fe-utils');

		const schemaData = { dbVersion };

		const columnDefinitions = _.toPairs(jsonSchema.properties || {}).map(([name, column]) => {
			const definitionJsonSchema = getDefinitionByReference({
				propertySchema: column,
				modelDefinitions,
				internalDefinitions,
				externalDefinitions,
			});

			return createColumnDefinitionBySchema({
				name,
				jsonSchema: column,
				parentJsonSchema: jsonSchema,
				ddlProvider,
				schemaData,
				definitionJsonSchema,
			});
		});

		const updatedUdt = createColumnDefinitionBySchema({
			name: jsonSchema.code || jsonSchema.name,
			jsonSchema: jsonSchema,
			parentJsonSchema: { required: [] },
			definitionJsonSchema: {},
			ddlProvider,
			schemaData,
		});

		const udt = { ...updatedUdt, properties: columnDefinitions };

		const script = ddlProvider.createUdt(udt);
		return AlterScriptDto.getInstance([script], true, false);
	};

/**
 * @return { (udt: Object) => AlterScriptDto }
 * */
const getDeleteUdtScriptDto = app => udt => {
	const _ = app.require('lodash');
	const { wrapInQuotes, getUdtName } = require('../../utils/general')(_);
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	const udtName = getUdtName(udt);
	const ddlUdtName = wrapInQuotes(udtName);

	if (udt.type === 'domain') {
		const script = ddlProvider.dropDomain(ddlUdtName);
		return AlterScriptDto.getInstance([script], true, true);
	} else {
		const script = ddlProvider.dropType(ddlUdtName);
		return AlterScriptDto.getInstance([script], true, true);
	}
};

/**
 * @return { (udt: Object) => Array<AlterScriptDto> }
 * */
const getAddColumnToTypeScriptDtos =
	({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }) =>
	udt => {
		const _ = app.require('lodash');
		const { createColumnDefinitionBySchema } = require('./createColumnDefinition')(app);
		const { wrapInQuotes, getUdtName } = require('../../utils/general')(_);
		const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);
		const { getDefinitionByReference } = app.require('@hackolade/ddl-fe-utils');

		const fullName = wrapInQuotes(getUdtName(udt));
		const schemaData = { dbVersion };

		return _.toPairs(udt.properties)
			.filter(([name, jsonSchema]) => !jsonSchema.compMod)
			.map(([name, jsonSchema]) => {
				const definitionJsonSchema = getDefinitionByReference({
					propertySchema: jsonSchema,
					modelDefinitions,
					internalDefinitions,
					externalDefinitions,
				});

				return createColumnDefinitionBySchema({
					name,
					jsonSchema,
					parentJsonSchema: { required: [] },
					ddlProvider,
					schemaData,
					definitionJsonSchema,
				});
			})
			.map(ddlProvider.convertColumnDefinition)
			.map(script => ddlProvider.alterTypeAddAttribute(fullName, script))
			.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));
	};

/**
 * @return { (udt: Object) => Array<AlterScriptDto> }
 * */
const getDeleteColumnFromTypeScriptDtos = app => udt => {
	const _ = app.require('lodash');
	const { wrapInQuotes, getUdtName } = require('../../utils/general')(_);
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	const fullName = wrapInQuotes(getUdtName(udt));

	return _.toPairs(udt.properties)
		.filter(([name, jsonSchema]) => !jsonSchema.compMod)
		.map(([name]) => ddlProvider.alterTypeDropAttribute(fullName, wrapInQuotes(name)))
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, true));
};

/**
 * @return { (udt: Object) => Array<AlterScriptDto> }
 * */
const getModifyColumnOfTypeScriptDtos = app => udt => {
	const _ = app.require('lodash');
	const { checkFieldPropertiesChanged, wrapInQuotes, getUdtName } = require('../../utils/general')(_);
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	const fullName = wrapInQuotes(getUdtName(udt));

	const renameColumnScriptDtos = _.values(udt.properties)
		.filter(jsonSchema => checkFieldPropertiesChanged(jsonSchema.compMod, ['name']))
		.map(jsonSchema => {
			const oldColumnDdlName = wrapInQuotes(jsonSchema.compMod.oldField.name);
			const newColumnDdlName = wrapInQuotes(jsonSchema.compMod.newField.name);
			return ddlProvider.alterTypeRenameAttribute(fullName, oldColumnDdlName, newColumnDdlName);
		})
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));

	const changeTypeScriptDtos = _.toPairs(udt.properties)
		.filter(([name, jsonSchema]) => checkFieldPropertiesChanged(jsonSchema.compMod, ['type', 'mode']))
		.map(([name, jsonSchema]) => {
			const ddlColumnName = wrapInQuotes(name);
			const columnType = jsonSchema.compMod.newField.mode || jsonSchema.compMod.newField.type;
			return ddlProvider.alterTypeChangeAttributeType(fullName, ddlColumnName, columnType);
		})
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));

	return [...renameColumnScriptDtos, ...changeTypeScriptDtos];
};

module.exports = {
	getCreateUdtScriptDto,
	getDeleteUdtScriptDto,
	getAddColumnToTypeScriptDtos,
	getDeleteColumnFromTypeScriptDtos,
	getModifyColumnOfTypeScriptDtos,
};
