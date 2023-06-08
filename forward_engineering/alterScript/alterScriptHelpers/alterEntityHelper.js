const {getModifyCheckConstraintScripts} = require("./entityHelpers/checkConstraintHelper");
const {getModifyEntityCommentsScripts} = require("./entityHelpers/commentsHelper");
const {getUpdateTypesScriptDtos} = require("./columnHelpers/alterTypeHelper");
const {getModifyNonNullColumnsScriptDtos} = require("./columnHelpers/nonNullConstraintHelper");
const {getModifiedCommentOnColumnScriptDtos} = require("./columnHelpers/commentsHelper");
const {getRenameColumnScriptDtos} = require("./columnHelpers/renameColumnHelper");

const getAddCollectionScript =
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

		return ddlProvider.createTable(hydratedTable, jsonSchema.isActivated);
	};

const getDeleteCollectionScript = app => collection => {
	const _ = app.require('lodash');
	const {getFullTableName} = require("../../utils/general")(_);
	const fullName = getFullTableName(collection);
	return `DROP TABLE IF EXISTS ${fullName};`;
};

/**
 * @return (collection: Object) => Array<string>
 * */
const getModifyCollectionScript = (app) => (collection) => {
	const _ = app.require('lodash');
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	const modifyCheckConstraintScripts = getModifyCheckConstraintScripts(_, ddlProvider)(collection);
	const modifyCommentScripts = getModifyEntityCommentsScripts(_, ddlProvider)(collection);
	return [
		...modifyCheckConstraintScripts,
		...modifyCommentScripts
	];
}

const getAddColumnScript =
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
			.map(script => `ALTER TABLE IF EXISTS ${fullName} ADD COLUMN IF NOT EXISTS ${script};`);
	};

const getDeleteColumnScript = app => collection => {
	const _ = app.require('lodash');
	const { getEntityName, getNamePrefixedWithSchemaName, wrapInQuotes } = require('../../utils/general')(_);

	const collectionSchema = { ...collection, ...(_.omit(collection?.role, 'properties') || {}) };
	const tableName = getEntityName(collectionSchema);
	const schemaName = collectionSchema.compMod?.keyspaceName;
	const fullName = getNamePrefixedWithSchemaName(tableName, schemaName);

	return _.toPairs(collection.properties)
		.filter(([name, jsonSchema]) => !jsonSchema.compMod)
		.map(([name]) => `ALTER TABLE IF EXISTS ${fullName} DROP COLUMN IF EXISTS ${wrapInQuotes(name)};`);
};

const getModifyColumnScript = app => collection => {
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
	getAddCollectionScript,
	getDeleteCollectionScript,
	getModifyCollectionScript,
	getAddColumnScript,
	getDeleteColumnScript,
	getModifyColumnScript,
};
