var createChatWidget = null;
var chatWidget = null;
(() => {
  function __insertModal(containerConfig) {
    const modalId = 'chat-embed-modal-' + +new Date();

    var modalHTML = `
      <div class="btn-container" onclick="document.getElementById('${modalId}').style.display = 'block';"><button class="rounded-btn" id="${modalId}-btn">Open chat</button></div>
      <div id="${modalId}" class="modal">
        <div class="modal-content">
          <span class="close" onclick="document.getElementById('${modalId}').style.display = 'none';">&times;</span>
          <div id="${modalId}-modal-content-inner-container"></div>
        </div>
      </div>
      `;

    const container = document.createElement('div');
    container.innerHTML = modalHTML;

    var modalCSS = `
        #${modalId} {
          display: none;
          position: fixed;
          z-index: 1;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          overflow: auto;
          background-color: rgba(0,0,0,0.4);
        }
        .rounded-btn {
          position: absolute;
          bottom: 10px;
          right: 10px;
          padding: 30px 60px;
          border-radius: 40px;
          background-color: #0A90EB;
          color: white;
          font-size: x-large;
          font-weight: bold;
          cursor: pointer;
          border: 0;
        }
        .modal-content {
          background-color: #fefefe;
          margin-left: auto;
          margin-right: auto;
          margin-top: 5%;
          padding: 20px;
          border: 1px solid #888;
          width: 80%;
        }
        .close {
          color: #aaa;
          float: right;
          font-size: 28px;
          font-weight: bold;
        }
        .close:hover,
        .close:focus {
          color: black;
          text-decoration: none;
          cursor: pointer;
        }
      `;

    // Append the modal HTML and CSS to the page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    if ('openChatButton' in containerConfig && containerConfig.openChatButton) {
      const button = document.getElementById(`${modalId}-btn`);

      const styles = containerConfig.openChatButton;

      const keys = ['background', 'backgroundColor', 'border', 'borderRadius', 'maxWidth', 'maxHeight', 'color', 'minWidth', 'minHeight', 'width', 'height', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];

      for (const key of keys) {
        if (key in styles) {
          button.style[key] = styles[key];
        }
      }

      if ('text' in containerConfig.openChatButton) {
        button.innerText = containerConfig.openChatButton.text;
      }
    }

    var style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(modalCSS));
    document.head.appendChild(style);

    return document.getElementById(`${modalId}-modal-content-inner-container`);
  }
  function _createChatWidget(config = {}) {
    if (!config) {
      config = {};
    }
    if (chatWidget) {
      console.warn('Chat widget is already instantiated');
    }
    if (!config.parent) {
      config.parent = __insertModal('styles' in config && config.styles || {});
    }
    const apiUrl = '{{VUE_APP_FRONT_HOST}}';

    const iframeId = 'chat-embed-iframe-' + +new Date();
    config.parent.insertAdjacentHTML('beforeend', `<iframe style="width: 100%; min-height: 200px;" frameborder="0" scrolling="no" id="${iframeId}"/>`);
    document.getElementById(iframeId).src = apiUrl + '/embed/chat?' + (config.project_id ? `project_id=` + config.project_id : '');

    chatWidget = document.getElementById(iframeId);

    setInterval(() => {
      const iframe = document.getElementById(iframeId);
      iframe.style.height = (iframe.contentWindow.document.body.scrollHeight) + 'px';
    }, 500)

    return chatWidget;
  }

  createChatWidget = _createChatWidget;
})()