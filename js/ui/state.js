export const ui = {
    root: document.getElementById('app'),
    controls: {},
    results: {},
    modals: {},
};

let generateHandler = null;

export function setGenerateHandler(handler) {
    generateHandler = handler;
}

export function getGenerateHandler() {
    return generateHandler;
}
