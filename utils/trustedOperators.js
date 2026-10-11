const TRUSTED_OPERATOR_IDS = new Set([
    "1376280550217875508",
    "1133098688693145753"
]);

function isTrustedOperator(userOrId) {
    const id = typeof userOrId === "string"
        ? userOrId
        : userOrId?.id;

    return Boolean(id && TRUSTED_OPERATOR_IDS.has(String(id)));
}

module.exports = {
    TRUSTED_OPERATOR_IDS,
    isTrustedOperator
};
