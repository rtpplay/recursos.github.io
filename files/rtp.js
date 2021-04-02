/*
2021-04-02
v 1.12 lida com "{hls : atob( decodeURIComponent("
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
          let resp = {
            vurl: "",
            name: "",
          };
          const style1 = "streaming-ondemand";
          const style2 = "ondemand-streaming";
          // which case?
          if (docBody.indexOf("{hls : decodeURIComponent(") > 0) {
            resp = prepURLandName("decodeURIComponent");
          } else if (docBody.indexOf("{hls : atob(decodeURIComponent(") > 0) {
            resp = prepURLandName("atob( decodeURIComponent)");
          } else if (docBody.indexOf("{hls : atob( decodeURIComponent(") > 0) {
            resp = prepURLandName("atob( decodeURIComponent)");
          } else if (docBody.indexOf('"contentUrl":') > 0) {
            resp = prepURLandName("contentUrl");
          } else if (docBody.indexOf('content_type : "audio",') > 0) {
            resp = prepURLandName(".mp3");
          } else if (docBody.indexOf('.m3u8') > 0) {
            resp = prepURLandName(".mp4");
          } else {
            console.error("nem um nem outro?");
            // check new RTP Play strategies:
          }
          return resp;
          //
          // extract URL and name from page body
          function prepURLandName(mediaType) {
            let trueVideoUrl = "";
            let preVideoUrl = "";
            switch (mediaType) {
              case "decodeURIComponent":
                fromIndex = docBody.indexOf("[", docBody.indexOf("{hls : decodeURIComponent("));
                toIndex = docBody.indexOf("]", fromIndex) + 1;
                preVideoUrl = docBody.substring(fromIndex + 1, toIndex - 1);
                preVideoUrl = decodeURIComponent(eval('[' + preVideoUrl + ']').join(""))
                preVideoUrl = preVideoUrl.replace("/master.m3u8", "");
                // amend mediaType:
                mediaType = ".mp4"
                break;
              case "atob(decodeURIComponent)":
                fromIndex = docBody.indexOf("[", docBody.indexOf("{hls : atob(decodeURIComponent("));
                toIndex = docBody.indexOf("]", fromIndex) + 1;
                preVideoUrl = docBody.substring(fromIndex + 1, toIndex - 1);
                preVideoUrl = atob(decodeURIComponent(eval('[' + preVideoUrl + ']').join("")));
                preVideoUrl = preVideoUrl.replace("/master.m3u8", "");
                // amend mediaType:
                mediaType = ".mp4"
                break;
              case "atob( decodeURIComponent)":
                fromIndex = docBody.indexOf("[", docBody.indexOf("{hls : atob( decodeURIComponent("));
                toIndex = docBody.indexOf("]", fromIndex) + 1;
                preVideoUrl = docBody.substring(fromIndex + 1, toIndex - 1);
                preVideoUrl = atob(decodeURIComponent(eval('[' + preVideoUrl + ']').join("")));
                preVideoUrl = preVideoUrl.replace("/master.m3u8", "");
                // amend mediaType:
                mediaType = ".mp4"
                break;				
              case ".mp4":
                // Syntax: str.lastIndexOf(searchValue[, fromIndex])
                fromIndex = docBody.indexOf("/master.m3u8");
                backToIndex = docBody.lastIndexOf("https://", fromIndex)
                preVideoUrl = docBody.substring(backToIndex, fromIndex);
                // preVideoUrl = "https:" + docBody.split(token).pop().split(".m3u8")[0];
                // https://streaming-ondemand.rtp.pt/nas2.share/h264/512x384/p6657/p6657_1_202012201253232792/master [.m3u8]
                // que quero transformar em:
                // https://ondemand.rtp.pt/nas2.share/h264/512x384/p6657/p6657_1_202012201253232792.mp4
                break;
              case "contentUrl":
                fromIndex = docBody.indexOf("_videoprv.mp4", docBody.indexOf("contentUrl"))
                backToIndex = docBody.lastIndexOf("https://", fromIndex)
                preVideoUrl = docBody.substring(backToIndex, fromIndex);
                // amend mediaType:
                mediaType = ".mp4"
                break;
              case ".mp3":
                // "https://cdn-ondemand.rtp.pt/nas2.share/wavrss/at3/2102/PGM2100403403401_355271-2102161509.mp3"
                fromIndex = docBody.indexOf(".mp3"); // preVideoUrl = docBody.split('file: "').pop().split('.mp3')[0];
                backToIndex = docBody.lastIndexOf("https://", fromIndex)
                preVideoUrl = docBody.substring(backToIndex, fromIndex);
                break;
            }
            // alguma limpeza
            preVideoUrl = preVideoUrl.replace("preview/", "")
            preVideoUrl = preVideoUrl.replace("cdn-ondemand", style1)
            preVideoUrl = preVideoUrl.replace(style1, style2); // se ".mp3" é inócuo
            trueVideoUrl = preVideoUrl + mediaType;
            preTitle = docBody.match('(?<=<meta itemprop="name" content=)(.*)(?=>)');
            /*
            content_type : "video", COULD ALSO BE: content_type : "audio",
            content_title : "Glumpers",
            content_episode : "13", (or: content_episode : "",)
            content_date: "2020-12-29"
            content_img : 
            */
            let contentTitle = docBody.match('(?<=content_title : ")(.*)(?=",)');
            let contentEpisode = docBody.match('(?<=content_episode : ")(.*)(?=",)');
            let prefix = ""
            if (contentEpisode[0] != "") {
              prefix = `EP${contentEpisode[0]}-`;
            }
            let contentDate = docBody.match('(?<=content_date: ")(.*)(?=",)');
            let videoName = `${prefix}${contentTitle[0]}-${contentDate[0]}`;
            videoName = videoName.replace(":", "-");
            // vamos livrar-nos de coisas más dentro do "name":
            videoName = videoName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '') + mediaType; //".mp4";
            resp.vurl = trueVideoUrl;
            resp.name = videoName;
            return resp;
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
              injectXdiv(obj); // this is in popup.html and adds (several) <div class="
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
      // function injectXdiv(xurl = "<strong>Hi there!</strong> inside popup.") {
      function injectXdiv(obj) {
        if (exists = document.getElementById("ndiv") == null) {
          let ndiv = document.createElement('div');
          ndiv.id = "ndiv"; // inside page activetab Elements
          ndiv.innerHTML = obj.name;
          document.body.append(ndiv); // nesta altura o popup.html "incha"
        }
      }
    });
  });
