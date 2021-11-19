/**
 * Don't overwrite existing non-null/undefined properties
 *
 * @param {Array<Record<string, any>>} objs
 */
const nonDestructiveMerge = (objs) => {
    return objs.reduce((out, obj) => {
        return Object.entries(obj).reduce((o, [key, value]) => {
            if ((!(key in o)
                || (
                    o[key] === null ||
                    o[key] === undefined ||
                    (Array.isArray(o[key]) && !o[key].length)) ||
                    (typeof o[key] === 'object' && !Object.keys(o[key]).length)) &&
                (value !== null && value !== undefined)
            ) {
                o[key] = value;
            }
            return o;
        }, out);
    }, {});
};

module.exports = {
    nonDestructiveMerge,
}
