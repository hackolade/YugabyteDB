const {getFullTableName} = require("../ddlHelper");

const getRenameColumnScripts = (_, ddlProvider) => (collection) => {
    const fullTableName = getFullTableName(_)(collection);
    const { checkFieldPropertiesChanged } = require('../../../utils/general')(_);
    const {wrapInQuotes} = require('../../general')({_});

    return _.values(collection.properties)
        .filter(jsonSchema => checkFieldPropertiesChanged(jsonSchema.compMod, ['name']))
        .map(
            jsonSchema => {
                const oldColumnName = wrapInQuotes(jsonSchema.compMod.oldField.name);
                const newColumnName = wrapInQuotes(jsonSchema.compMod.newField.name);
                return ddlProvider.renameColumn(fullTableName, oldColumnName, newColumnName);
            }
        );
}

module.exports = {
    getRenameColumnScripts
}
