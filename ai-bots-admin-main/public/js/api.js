const API_HOST = '/';
var _tk_upd = null;


const escapeHtml = (unsafe) => {
    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
const authHeaders = (n) => {
    const header = `Bearer ${getCookie(n)}`;
    return header;
}
const getHeaders = (a_n) => {
    return {
        Authorization: authHeaders(a_n),
    }    
}
const request = (options, success, error) => $.ajax(options).done(function(data) { success(data); }).fail(function(data) { error(data.responseJSON) })

function getFormData($form, skipEmpty = false){
    var unindexed_array = $form.serializeArray();
    const data = new FormData();
    $.map(unindexed_array, function(n, i){
        if (skipEmpty && !n['value']) {
            return;
        }
        data.append(n['name'], n['value']);
    });
    $form.find('input[type=file]').each((i, v) => {
        if ($(v)[0].files.length) {
            data.append($(v)[0].name, $(v)[0].files[0]);
        }
    });
    return data;
}
function getUrl(path, module = null){
    return API_HOST + getRoute(path, module);
}
const sendFormData = (path, form, add_data = {}, multipart = false, skipEmpty = false) => new Promise((resolve, reject) => {
    const data = getFormData(form, skipEmpty);
    for(const key of Object.keys(add_data)) {
        data.append(key, add_data[key]);
    }
    const url = getUrl(path);
    return postRequest(url, data, multipart)
        .then(data => {
            updateErrors([]);
            resolve(data);
        })
        .catch(data => {
            if (data.message) {
                if (Array.isArray(data.message)) {
                    updateErrors(data.message);
                } else {
                    updateErrors([data.message]);
                }    
            }
            reject(data);
        });
});
const postRequest = (url, data, formdata = false) => new Promise((resolve, reject) => {
    let data_fin = null;
    if (data) {
        if (!formdata) {
            data_fin = {};
            data.forEach((value, key) => (data_fin[key] = value));
            data_fin = JSON.stringify(data_fin);
        } else {
            data_fin = data;
        }    
    }
    return request({ url, 
        data: data_fin,
        cache: false,
        contentType: formdata ? false : 'application/json',
        processData: false,
        type: 'POST',
        headers: getHeaders('a'),
    }, 
    function success(data) {
        resolve(data);
    }, 
    function error(data) {
        reject(data);
    });
});
const getRequest = (path, data, module) => new Promise((resolve, reject) => {
    const url = getUrl(path, module);
    return request({ url, 
        data,
        type: 'GET',
        headers: getHeaders('a'),
    }, 
    function success(data) {
        resolve(data);
    }, 
    function error(data) {
        reject(data);
    });
});
const submitForm = (event) => {
    event.preventDefault();
    const form = $(event.target);
    const method = form.data('action');
    window[method](form);
}
const updateErrors = (errors) => {
    console.error(errors);
    return;
    const list = $(error_ouput).find('ul');
    list.empty();
    errors.forEach(v => list.append('<li>' + escapeHtml(v) + '</li>'));
    $(error_ouput)[0].scrollTop = $(error_ouput)[0].scrollHeight;
}
const toggleForm = ($form, status) => {
    $($form).find('input').each((i, el) => {
        if (!status) {
            $(el).attr('readonly', 'readonly');
        } else {
            $(el).removeAttr('readonly');
        }
    });
}
function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
function setToken(token) {
    setCookie('a', token, 1);
}
function updToken() {
    postRequest(API_HOST + getRoute('refresh-token', 'auth')).then(({ status, token }) => status && setToken(token));
}
function tokenUpdater() {
    if (!_tk_upd) {
        updToken()
        _tk_upd = setInterval(updToken, 60 * 1000)
    }
}
tokenUpdater();