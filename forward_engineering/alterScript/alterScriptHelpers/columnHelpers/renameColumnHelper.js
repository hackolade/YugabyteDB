const { AlterCollectionDto } = require('../../types/AlterCollectionDto');
const { AlterScriptDto } = require('../../types/AlterScriptDto');

/**
 * @return {(collection:  AlterCollectionDto) => Array<AlterScriptDto> }
 * */
const getRenameColumnScriptDtos = (_, ddlProvider) => collection => {
	const { getFullTableName, wrapInQuotes, checkFieldPropertiesChanged } = require('../../../utils/general')(_);
	const fullTableName = getFullTableName(collection);

	return _.values(collection.properties)
		.filter(jsonSchema => checkFieldPropertiesChanged(jsonSchema.compMod, ['name']))
		.map(jsonSchema => {
			const oldColumnName = wrapInQuotes(jsonSchema.compMod.oldField.name);
			const newColumnName = wrapInQuotes(jsonSchema.compMod.newField.name);
			return ddlProvider.renameColumn(fullTableName, oldColumnName, newColumnName);
		})
		.map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));
};

module.exports = {
	getRenameColumnScriptDtos,
};
