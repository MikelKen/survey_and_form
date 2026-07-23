export const isSafeCursorName = (name) => {
    return /^\w+$/.test(name);
}