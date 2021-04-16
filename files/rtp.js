/*
v 1.17 reversão para atob( simplificada [astúcia - créditos: @cisnemania]
*/
// region {popup}
let activeTabUrl;
chrome.tabs.query({
    currentWindow: true,
    active: true
  },
  function (tabs) {
    var activeTab = tabs[0];
    activeTabUrl = JSON.stringify(activeTab.url);
    if (activeTabUrl.indexOf("www.rtp.pt/play") === -1) {
      console.info("not RTPPlay");
      return; // do nothing
    } else {
      console.info("OK, RTPPlay");
    }
    document.getElementById("RTP_button").addEventListener('click', () => {
      // 
      function modifyDOM() {
        //You can play with your DOM here or check URL against your regex
        // this one logs in web page console
        let docBody = document.body.innerHTML;
        let resp = getUrlAndName(docBody);
        trueVideoUrl = resp.vurl;
        videoName = resp.name;
        // inspirado em:
        // https://gist.github.com/akirattii/2f55bb320f414becbc42bbe56313a28b
        // este truque no fim, por meio do erro, envia o videoUrl correcto!!
        chrome.runtime.onMessage.addListener(
          function (request, sender, sendResponse) {
            if (request.cmd == "any command") {
              // sendResponse({ result: "any response from background" });
              sendResponse({
                result: "any response from background"
              });
            } else {
              // como o cmd !="any command" dá sempre "error"
              // mas envia a message na mesma!
              // o meu mal é que aqui só result: "error" é quee sta definido!
              // parece que o resto não chegou aqui!
              let resp = {
                result: "error",
                vurl: trueVideoUrl,
                name: videoName,
              };
              respStr = JSON.stringify(resp);
              sendResponse(respStr);
            }
            // Note: Returning true is required here!
            //  ref: http://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
            return true;
          });
        // from <body>..</body> estract video url and video title
        function getUrlAndName(docBody) {
          videoName = getVName(docBody);
          // which case?
          docBody = docBody.replace(/\s+/g, '');
          if (docBody.indexOf("fileKey:atob(decodeURIComponent(") > 0) {
            videoUrl = getURL(docBody, "fileKey:atob(");
          } else if (docBody.indexOf('fileKey:"/') > 0) {
            videoUrl = getURL(docBody, 'fileKey:"/');
          } else {
            console.error("nem um nem outro?");
            // check new RTP Play strategies:
          }
          let resp = {
            vurl: videoUrl,
            name: videoName,
          };
          return resp;
          //
          // extract URL from page body
          function getURL(body, type) {
            let trueVideoUrl = "";
            let preVideoUrl = "";
            let tmpVideoUrl = "";
            const preface = '"aHR0cHM","6Ly9zdH","JlYW1pb","mctYXJx","dWl2by1","vbmRlbW","FuZC5yd","HAucHQv",'
            switch (type) {
              case "fileKey:atob(":
                fromIndex = body.indexOf("[", body.indexOf("fileKey:atob(decodeURIComponent("));
                toIndex = body.indexOf("]", fromIndex) + 1;
                preVideoUrl = body.substring(fromIndex + 1, toIndex - 1);
                preVideoUrl = preface + preVideoUrl;
                trueVideoUrl = atob(decodeURIComponent(eval('[' + preVideoUrl + ']').join("")));
                break;
              case 'fileKey:"/':
                fromIndex = body.indexOf('fileKey:"/');
                toIndex = body.indexOf(",", fromIndex) + 1;
                preVideoUrl = body.substring(fromIndex + ('fileKey:"').length, toIndex - 2);
                tmpVideoUrl = encodeURIComponent(btoa(preVideoUrl)).split(/(.{7})/).filter(O => O)
                tmpVideoUrl = tmpVideoUrl.toString();
                tmpVideoUrl = '"' + tmpVideoUrl.replace(/,/g, '","') + '"';
                tmpVideoUrl = preface + tmpVideoUrl;
                trueVideoUrl = atob(decodeURIComponent(eval('[' + tmpVideoUrl + ']').join("")));
                break;
            }
            return trueVideoUrl;
          }
          function getVName(body) {
            preTitle = body.match('(?<=<meta itemprop="name" content=)(.*)(?=>)');
            /*
            content_type : "video", COULD ALSO BE: content_type : "audio",
            content_title : "Glumpers",
            content_episode : "13", (or: content_episode : "",)
            content_date: "2020-12-29"
            content_img : 
            */
            let contentTitle = body.match('(?<=content_title : ")(.*)(?=",)');
            let contentEpisode = body.match('(?<=content_episode : ")(.*)(?=",)');
            let prefix = ""
            if (contentEpisode[0] != "") {
              prefix = `EP${contentEpisode[0]}-`;
            }
            let contentDate = docBody.match('(?<=content_date: ")(.*)(?=",)');
            let vName = `${prefix}${contentTitle[0]}-${contentDate[0]}`;
            vName = vName.replace(":", "-");
            // vamos livrar-nos de coisas más dentro do "name":
            vName = vName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '') + ".mp4";
            return vName;
          }
        }
      }
      // end-region {popup}
      //We have permission to access the activeTab, so we can call chrome.tabs.executeScript:
      chrome.tabs.executeScript({
        code: '(' + modifyDOM + ')();' //argument here is a string but function.toString() returns function's code
      }, (results) => {
        // este truque no fim, por meio do erro, recebe o videoUrl correcto!!
        // agora, como o usar??
        chrome.tabs.query({
          active: true,
          currentWindow: true
        }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            message: 'fake msg'
          }, function (response) {
            // If this message's recipient sends a response it will be handled here
            try {
              let obj = JSON.parse(response);
              // {result: "error", vurl: "https://ondemand.rtp...4d.mp4", name: "E62...-01-22.mp4"}
              if (chrome.runtime.lastError) {
              }
              let myVideoUrl = obj.vurl;
              let videoName = obj.name;
			  /*
              // REMOVER, NÃO FAZ PARTE DO PRODUTO FINAL!
              injectXdiv(obj); // this is in popup.html and adds (several) <div class="
			  */
              // testar em OPERA e Firefox
              chrome.downloads.download({
                url: myVideoUrl,
                filename: videoName,
                conflictAction: 'uniquify',
                saveAs: true
              })
            } catch (err) {
              console.error(err.name);
              console.error(err.message);
            }
          });
        });
      });
      // REMOVER, NÃO FAZ PARTE DO PRODUTO FINAL!
      // function injectXdiv(xurl = "<strong>Hi there!</strong> inside popup.") {
      function injectXdiv(obj) {
        if (exists = document.getElementById("ndiv") == null) {
          let ndiv = document.createElement('div');
          ndiv.id = "ndiv"; // inside page activetab Elements
          ndiv.innerHTML = obj.name;
          document.body.append(ndiv); // nesta altura o popup.html "incha"
          let udiv = document.createElement('div');
          udiv.id = "udiv"; // inside page activetab Elements
          udiv.innerHTML = obj.vurl;
          document.body.append(udiv); // nesta altura o popup.html "incha"
        }
      }
    });
  });
