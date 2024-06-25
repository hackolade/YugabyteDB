const {AlterCollectionDto} = require('../../types/AlterCollectionDto');
const {AlterScriptDto} = require('../../types/AlterScriptDto');

/**
 * @return {(collection:  AlterCollectionDto) => Array<AlterScriptDto> }
 * */
const getUpdatedCommentOnColumnScriptDtos = (_, ddlProvider) => (collection) => {
    const {getFullColumnName, wrapComment} = require("../../../utils/general")(_);
    return _.toPairs(collection.properties)
        .filter(([name, jsonSchema]) => {
            const newComment = jsonSchema.description;
            const oldName = jsonSchema.compMod.oldField.name;
            const oldComment = collection.role.properties[oldName]?.description;
            return newComment && (!oldComment || newComment !== oldComment);
        })
        .map(([name, jsonSchema]) => {
            const newComment = jsonSchema.description;
            const ddlComment = wrapComment(newComment);
            const columnName = getFullColumnName(collection, name);
            return ddlProvider.updateColumnComment(columnName, ddlComment);
        })
        .map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, false));
}


/**
 * @return {(collection:  AlterCollectionDto) => Array<AlterScriptDto> }
 * */
const getDeletedCommentOnColumnScriptDtos = (_, ddlProvider) => (collection) => {
    const {getFullColumnName} = require("../../../utils/general")(_);

    return _.toPairs(collection.properties)
        .filter(([name, jsonSchema]) => {
            const newComment = jsonSchema.description;
            const oldName = jsonSchema.compMod.oldField.name;
            const oldComment = collection.role.properties[oldName]?.description;
            return oldComment && !newComment;
        })
        .map(([name, jsonSchema]) => {
            const columnName = getFullColumnName(collection, name);
            return ddlProvider.dropColumnComment(columnName);
        })
        .map(scriptLine => AlterScriptDto.getInstance([scriptLine], true, true));
}

/**
 * @return {(collection:  AlterCollectionDto) => Array<AlterScriptDto> }
 * */
const getModifiedCommentOnColumnScriptDtos = (_, ddlProvider) => (collection) => {
    const updatedCommentScriptDtos = getUpdatedCommentOnColumnScriptDtos(_, ddlProvider)(collection);
    const deletedCommentScriptDtos = getDeletedCommentOnColumnScriptDtos(_, ddlProvider)(collection);
    return [...updatedCommentScriptDtos, ...deletedCommentScriptDtos];
}

module.exports = {
    getModifiedCommentOnColumnScriptDtos
}
