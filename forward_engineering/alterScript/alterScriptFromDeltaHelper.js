const { AlterScriptDto } = require('./types/AlterScriptDto');
const {
	getAddContainerScriptDto,
	getDeleteContainerScriptDto,
	getModifyContainerScriptDtos
} = require('./alterScriptHelpers/alterContainerHelper');
const {
	getAddCollectionScriptDto,
	getDeleteCollectionScriptDto,
	getAddColumnScriptDtos,
	getDeleteColumnScriptDtos,
	getModifyColumnScriptDtos,
	getModifyCollectionScriptDtos,
} = require('./alterScriptHelpers/alterEntityHelper');
const {
	getDeleteUdtScript,
	getCreateUdtScript,
	getAddColumnToTypeScript,
	getDeleteColumnFromTypeScript,
	getModifyColumnOfTypeScript,
} = require('./alterScriptHelpers/alterUdtHelper');
const { getAddViewScript, getDeleteViewScript, getModifyViewScript} = require('./alterScriptHelpers/alterViewHelper');

const getComparisonModelCollection = collections => {
	return collections
		.map(collection => JSON.parse(collection))
		.find(collection => collection.collectionName === 'comparisonModelCollection');
};

/**
 * @return {Array<AlterScriptDto>}
 * */
const getAlterContainersScriptDtos = ({ collection, app}) => {
	const addedContainers = collection.properties?.containers?.properties?.added?.items;
	const deletedContainers = collection.properties?.containers?.properties?.deleted?.items;
	const modifiedContainers = collection.properties?.containers?.properties?.modified?.items;

	const addContainersScriptDtos = []
		.concat(addedContainers)
		.filter(Boolean)
		.map(container => getAddContainerScriptDto(app)(Object.keys(container.properties)[0]));
	const deleteContainersScriptDtos = []
		.concat(deletedContainers)
		.filter(Boolean)
		.map(container => getDeleteContainerScriptDto(app)(Object.keys(container.properties)[0]));
	const modifyContainersScriptDtos = []
		.concat(modifiedContainers)
		.filter(Boolean)
		.map(containerWrapper => Object.values(containerWrapper.properties)[0])
		.flatMap(container => getModifyContainerScriptDtos(app)(container))

	return [
		...addContainersScriptDtos,
		...deleteContainersScriptDtos,
		...modifyContainersScriptDtos,
	];
};

const getAlterCollectionsScriptDtos = ({
	collection,
	app,
	dbVersion,
	modelDefinitions,
	internalDefinitions,
	externalDefinitions,
}) => {
	const createCollectionsScriptDtos = []
		.concat(collection.properties?.entities?.properties?.added?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.filter(collection => collection.compMod?.created)
		.map(getAddCollectionScriptDto({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }));
	const deleteCollectionScriptDtos = []
		.concat(collection.properties?.entities?.properties?.deleted?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.filter(collection => collection.compMod?.deleted)
		.map(getDeleteCollectionScriptDto(app));
	const modifyCollectionScriptDtos = []
		.concat(collection.properties?.entities?.properties?.modified?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.map(getModifyCollectionScriptDtos(app))
		.flat();
	const addColumnScriptDtos = []
		.concat(collection.properties?.entities?.properties?.added?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.filter(collection => !collection.compMod)
		.flatMap(getAddColumnScriptDtos({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }));
	const deleteColumnScriptDtos = []
		.concat(collection.properties?.entities?.properties?.deleted?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.filter(collection => !collection.compMod)
		.flatMap(getDeleteColumnScriptDtos(app));
	const modifyColumnScriptDtos = []
		.concat(collection.properties?.entities?.properties?.modified?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.filter(collection => !collection.compMod)
		.flatMap(getModifyColumnScriptDtos(app));

	return [
		...createCollectionsScriptDtos,
		...deleteCollectionScriptDtos,
		...modifyCollectionScriptDtos,
		...addColumnScriptDtos,
		...deleteColumnScriptDtos,
		...modifyColumnScriptDtos,
	].map(script => script.trim());
};

const getAlterViewScripts = (collection, app) => {
	const createViewsScripts = []
		.concat(collection.properties?.views?.properties?.added?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.map(view => ({ ...view, ...(view.role || {}) }))
		.filter(view => view.compMod?.created && view.selectStatement)
		.map(getAddViewScript(app));

	const deleteViewsScripts = []
		.concat(collection.properties?.views?.properties?.deleted?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.map(view => ({ ...view, ...(view.role || {}) }))
		.map(getDeleteViewScript(app));

	const modifyViewsScripts = []
		.concat(collection.properties?.views?.properties?.modified?.items)
		.filter(Boolean)
		.map(viewWrapper => Object.values(viewWrapper.properties)[0])
		.map(view => ({ ...view, ...(view.role || {}) }))
		.flatMap(view => getModifyViewScript(app)(view));

	return [
		...deleteViewsScripts,
		...createViewsScripts,
		...modifyViewsScripts,
	].map(script => script.trim());
};

const getAlterModelDefinitionsScripts = ({
	collection,
	app,
	dbVersion,
	modelDefinitions,
	internalDefinitions,
	externalDefinitions,
}) => {
	const createUdtScripts = []
		.concat(collection.properties?.modelDefinitions?.properties?.added?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.map(item => ({ ...item, ...(app.require('lodash').omit(item.role, 'properties') || {}) }))
		.filter(item => item.compMod?.created)
		.map(getCreateUdtScript({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }));
	const deleteUdtScripts = []
		.concat(collection.properties?.modelDefinitions?.properties?.deleted?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.map(item => ({ ...item, ...(app.require('lodash').omit(item.role, 'properties') || {}) }))
		.filter(collection => collection.compMod?.deleted)
		.map(getDeleteUdtScript(app));
	const addColumnScripts = []
		.concat(collection.properties?.modelDefinitions?.properties?.added?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.filter(item => !item.compMod)
		.map(item => ({ ...item, ...(app.require('lodash').omit(item.role, 'properties') || {}) }))
		.filter(item => item.childType === 'composite')
		.flatMap(
			getAddColumnToTypeScript({ app, dbVersion, modelDefinitions, internalDefinitions, externalDefinitions }),
		);
	const deleteColumnScripts = []
		.concat(collection.properties?.modelDefinitions?.properties?.deleted?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.filter(item => !item.compMod)
		.map(item => ({ ...item, ...(app.require('lodash').omit(item.role, 'properties') || {}) }))
		.filter(item => item.childType === 'composite')
		.flatMap(getDeleteColumnFromTypeScript(app));

	const modifyColumnScripts = []
		.concat(collection.properties?.modelDefinitions?.properties?.modified?.items)
		.filter(Boolean)
		.map(item => Object.values(item.properties)[0])
		.filter(item => !item.compMod)
		.map(item => ({ ...item, ...(app.require('lodash').omit(item.role, 'properties') || {}) }))
		.filter(item => item.childType === 'composite')
		.flatMap(getModifyColumnOfTypeScript(app));

	return [
		...deleteUdtScripts,
		...createUdtScripts,
		...addColumnScripts,
		...deleteColumnScripts,
		...modifyColumnScripts,
	]
		.filter(Boolean)
		.map(script => script.trim());
};

module.exports = {
	getComparisonModelCollection,
	getAlterContainersScripts: getAlterContainersScriptDtos,
	getAlterCollectionsScripts: getAlterCollectionsScriptDtos,
	getAlterViewScripts,
	getAlterModelDefinitionsScripts,
};
