const routes = {
    auth: {
        'login': 'login',
        'refresh-token': 'refresh-token',
    },
    'bots': {
        'create': 'create',
        'update': 'update',
        'delete': 'delete',
    },
}

const getRoute = (method, module = null) => {
    if (!module) module = __module;
    return module + '/' + routes[module][method];
}