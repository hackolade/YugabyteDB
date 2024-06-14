const { AlterCollectionDto } = require('../../types/AlterCollectionDto');
const { AlterScriptDto } = require('../../types/AlterScriptDto');

/**
 * @return {(collection:  AlterCollectionDto) => Array<AlterScriptDto> }
 * */
const getModifyNonNullColumnsScriptDtos = (_, ddlProvider) => collection => {
	const { getFullTableName, wrapInQuotes } = require('../../../utils/general')(_);
	const fullTableName = getFullTableName(collection);

	const currentRequiredColumnNames = collection.required || [];
	const previousRequiredColumnNames = collection.role.required || [];

	const columnNamesToAddNotNullConstraint = _.difference(currentRequiredColumnNames, previousRequiredColumnNames);
	const columnNamesToRemoveNotNullConstraint = _.difference(previousRequiredColumnNames, currentRequiredColumnNames);

	const addNotNullConstraintsScripDtos = _.toPairs(collection.properties)
		.filter(([name, jsonSchema]) => {
			const oldName = jsonSchema.compMod.oldField.name;
			const shouldRemoveForOldName = columnNamesToRemoveNotNullConstraint.includes(oldName);
			const shouldAddForNewName = columnNamesToAddNotNullConstraint.includes(name);
			return shouldAddForNewName && !shouldRemoveForOldName;
		})
		.map(([columnName]) => ddlProvider.setNotNullConstraint(fullTableName, wrapInQuotes(columnName)))
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));

	const removeNotNullConstraintDtos = _.toPairs(collection.properties)
		.filter(([name, jsonSchema]) => {
			const oldName = jsonSchema.compMod.oldField.name;
			const shouldRemoveForOldName = columnNamesToRemoveNotNullConstraint.includes(oldName);
			const shouldAddForNewName = columnNamesToAddNotNullConstraint.includes(name);
			return shouldRemoveForOldName && !shouldAddForNewName;
		})
		.map(([name]) => ddlProvider.dropNotNullConstraint(fullTableName, wrapInQuotes(name)))
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, true));

	return [...addNotNullConstraintsScripDtos, ...removeNotNullConstraintDtos];
};

module.exports = {
	getModifyNonNullColumnsScriptDtos,
};
