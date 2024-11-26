

export const deleteKey = (obj, key) => {
    const newObj = { ...obj };
    delete newObj[key];
    return newObj;
}
