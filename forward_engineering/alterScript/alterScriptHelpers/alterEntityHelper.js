const {AlterCollectionDto} = require('../types/AlterCollectionDto');
const {AlterScriptDto} = require('../types/AlterScriptDto');

const {getModifyCheckConstraintScriptDtos} = require("./entityHelpers/checkConstraintHelper");
const {getModifyEntityCommentsScriptDtos} = require("./entityHelpers/commentsHelper");
const {getUpdateTypesScriptDtos} = require("./columnHelpers/alterTypeHelper");
const {getModifyNonNullColumnsScriptDtos} = require("./columnHelpers/nonNullConstraintHelper");
const {getModifiedCommentOnColumnScriptDtos} = require("./columnHelpers/commentsHelper");
const {getRenameColumnScriptDtos} = require("./columnHelpers/renameColumnHelper");

/**
 * @return {(collection: AlterCollectionDto) => {AlterScriptDto} }
 * */
const getAddCollectionScriptDto =
	({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }) =>
	collection => {
		const _ = app.require('lodash');
		const { getEntityName } = require('../../utils/general')(_);
		const { createColumnDefinitionBySchema } = require('./createColumnDefinition')(app);
		const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);
		const { getDefinitionByReference } = app.require('@hackolade/ddl-fe-utils');

		const schemaName = collection.compMod.keyspaceName;
		const schemaData = { schemaName, dbVersion };
		const jsonSchema = { ...collection, ...(_.omit(collection?.role, 'properties') || {}) };
		const columnDefinitions = _.toPairs(jsonSchema.properties).map(([name, column]) => {
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
		const checkConstraints = (jsonSchema.chkConstr || []).map(check =>
			ddlProvider.createCheckConstraint(ddlProvider.hydrateCheckConstraint(check)),
		);
		const tableData = {
			name: getEntityName(jsonSchema),
			columns: columnDefinitions.map(ddlProvider.convertColumnDefinition),
			checkConstraints: checkConstraints,
			foreignKeyConstraints: [],
			schemaData,
			columnDefinitions,
		};
		const hydratedTable = ddlProvider.hydrateTable({ tableData, entityData: [jsonSchema], jsonSchema });

		const script = ddlProvider.createTable(hydratedTable, jsonSchema.isActivated);
		return AlterScriptDto.getInstance([script], true, false);
	};

/**
 * @return {(collection: AlterCollectionDto) => AlterScriptDto}
 * */
const getDeleteCollectionScriptDto = app => collection => {
	const _ = app.require('lodash');
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);
	const {getFullTableName} = require("../../utils/general")(_);
	const fullName = getFullTableName(collection);

	const script = ddlProvider.dropTable(fullName);
	return AlterScriptDto.getInstance([script], true, true);
};

/**
 * @return {(collection: AlterCollectionDto) => Array<AlterScriptDto>}
 * */
const getModifyCollectionScriptDtos = (app) => (collection) => {
	const _ = app.require('lodash');
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	const modifyCheckConstraintScripts = getModifyCheckConstraintScriptDtos(_, ddlProvider)(collection);
	const modifyCommentScripts = getModifyEntityCommentsScriptDtos(_, ddlProvider)(collection);
	return [
		...modifyCheckConstraintScripts,
		...modifyCommentScripts
	];
}

/**
 * @return {(collection: AlterCollectionDto) => Array<AlterScriptDto>}
 * */
const getAddColumnScriptDtos =
	({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }) =>
	collection => {
		const _ = app.require('lodash');
		const { getEntityName, getNamePrefixedWithSchemaName } = require('../../utils/general')(_);
		const { createColumnDefinitionBySchema } = require('./createColumnDefinition')(app);
		const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);
		const { getDefinitionByReference } = app.require('@hackolade/ddl-fe-utils');

		const collectionSchema = { ...collection, ...(_.omit(collection?.role, 'properties') || {}) };
		const tableName = getEntityName(collectionSchema);
		const schemaName = collectionSchema.compMod?.keyspaceName;
		const fullName = getNamePrefixedWithSchemaName(tableName, schemaName);
		const schemaData = { schemaName, dbVersion };

		return _.toPairs(collection.properties)
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
					parentJsonSchema: collectionSchema,
					ddlProvider,
					schemaData,
					definitionJsonSchema,
				});
			})
			.map(ddlProvider.convertColumnDefinition)
			.map(script => ddlProvider.addColumn(fullName, script))
			.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));
	};

/**
 * @return {(collection: AlterCollectionDto) => Array<AlterScriptDto>}
 * */
const getDeleteColumnScriptDtos = app => collection => {
	const _ = app.require('lodash');
	const { getEntityName, getNamePrefixedWithSchemaName, wrapInQuotes } = require('../../utils/general')(_);
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	const collectionSchema = { ...collection, ...(_.omit(collection?.role, 'properties') || {}) };
	const tableName = getEntityName(collectionSchema);
	const schemaName = collectionSchema.compMod?.keyspaceName;
	const fullName = getNamePrefixedWithSchemaName(tableName, schemaName);

	return _.toPairs(collection.properties)
		.filter(([name, jsonSchema]) => !jsonSchema.compMod)
		.map(([name]) => ddlProvider.dropColumn(fullName, wrapInQuotes(name)))
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, true));
};

/**
 * @return {(collection: AlterCollectionDto) => Array<AlterScriptDto>}
 * */
const getModifyColumnScriptDtos = app => collection => {
	const _ = app.require('lodash');
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	const renameColumnScriptDtos = getRenameColumnScriptDtos(_, ddlProvider)(collection);
	const updateTypeScriptDtos = getUpdateTypesScriptDtos(_, ddlProvider)(collection);
	const modifyNotNullScriptDtos = getModifyNonNullColumnsScriptDtos(_, ddlProvider)(collection);
	const modifyCommentScriptDtos = getModifiedCommentOnColumnScriptDtos(_, ddlProvider)(collection);

	return [
		...renameColumnScriptDtos,
		...updateTypeScriptDtos,
		...modifyNotNullScriptDtos,
		...modifyCommentScriptDtos,
	];
};

module.exports = {
	getAddCollectionScriptDto,
	getDeleteCollectionScriptDto,
	getModifyCollectionScriptDtos,
	getAddColumnScriptDtos,
	getDeleteColumnScriptDtos,
	getModifyColumnScriptDtos,
};
