/*
2021-01-02 Oskar(0)Fork(1)
Começar em OSkar(0) e ir por pequenas mudanças a ver se percebo
Esta confusão funcionae e copia o videoUrl para o popup.html
Falta meter num input e botão de download
2021-01-06 Oskar(0)Fork(2)
Estou a ler o videoUrl e videoName (com dificuldade por <title> não
aparecer em docBody, não encontro explicação)
2021-01-06 Oskar(0)Fork(3)
Em "Glumpers" já sabe ir buscar o videoName (ao script, não ao HTML)
2021-01-07 Oskar(0)Fork(4)
Limpeza do popup e fazer download
2021-01-09 Oskar(0)Fork(5)
Usar JSON.jsonfy para a mensagem
2021-01-10 Oskar(0)Fork(6)
Corrigida a chamada a "function getUrlAndName(docBody)"
Cria uma <div> para name outra <div> para o URL
Preciso de conseguir evitar "repetições" mas admitir "novos URLs"
2021-01-10 Oskar(0)Fork(7)
usar chrome.downlads.download - SUCESSO
2021-01-17 Oskar(0)Fork(8)
Funciona para "filekey" e "hls" com imensa redundância de código
2021-01-20 Oskar(0)Fork(9)
remover crash se URL != RTP - tive de usar uma var global!!!
2021-01-22 Oskar(0)Fork(10) FUNCIONAL EM TODOS OS SITES
remover do videoName coisas como ":" e outros maléfico
saveAs já funciona
mensagem de alerta que o tab não é RTP
2021-01-24 Oskar(0)Fork(11)
limpeza
2021-02-04
RTPDwonload 1.01
se content_episode : "", não acrescentar o "E" como prefico
2021-02-07
RTPDwonload 1.02 tratar de audio (mp3)
2021-.02-10
RTPDwonload 1.03 melhorei a busca de substrings
2021-02-17
1.05 usa a troca streaming-ondemand ondemand-streaming copiada de PowerShell
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
    // console.log(activeTabUrl);

    if (activeTabUrl.indexOf("www.rtp.pt/play") === -1) {
      console.info("not RTPPlay");
      return; // do nothing
    } else {
      console.info("OK, RTPPlay");
    }

    document.getElementById("RTP_button").addEventListener('click', () => {
      console.log("this logs in popup.js console");
      // 
      function modifyDOM() {
        //You can play with your DOM here or check URL against your regex
        // this one logs in web page console
        // console.log(`document.body: ${document.body}`); // <body>... </body>

        let docBody = document.body.innerHTML;
        let resp = getUrlAndName(docBody);
        console.log(`modifyDOM() resp.vurl: ${resp.vurl}`);
        console.log(`modifyDOM() resp.name: ${resp.name}`);

        trueVideoUrl = resp.vurl;
        videoName = resp.name;
        // inspirado em:
        // https://gist.github.com/akirattii/2f55bb320f414becbc42bbe56313a28b
        // este truque no fim, por meio do erro, envia o videoUrl correcto!!
        console.log("addListener"); // aparece em Elements
        chrome.runtime.onMessage.addListener(
          function (request, sender, sendResponse) {
            console.log("request.cmd"); // aparece em Elements
            if (request.cmd == "any command") {
              // sendResponse({ result: "any response from background" });
              sendResponse({
                result: "any response from background"
              });
            } else {
              // como o cmd !="any command" dá sempre "error"
              // mas envia a message na mesma!
              console.log("sendResponse"); // aparece em Elements
              // o meu mal é que aqui só result: "error" é quee sta definido!
              // parece que o resto não chegou aqui!
              let resp = {
                result: "error",
                vurl: trueVideoUrl,
                name: videoName,
              };
              console.log(`addListener() resp ${resp}`); // aparece em Elements
              console.log(`addListener() resp.result: ${resp.result}`);
              console.log(`addListener() resp.vurl: ${resp.vurl}`);
              console.log(`addListener() resp.name: ${resp.name}`);
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
          if (docBody.indexOf('.m3u8') > 0) {
            console.log("mediaType: .m3u8 or .mp4");
            resp = prepURLandName(".mp4");
          } else if (docBody.indexOf('content_type : "audio",') > 0) {
            resp = prepURLandName(".mp3");
            console.log("mediaType: .mp3");
          } else {
            console.error("nem um nem outro?");
          }
          return resp;

          //
          // extract URL and name from page body
          function prepURLandName(mediaType) {
            let trueVideoUrl = "";
            let preVideoUrl = "";
            switch (mediaType) {
              case ".mp4":
                // Syntax: str.lastIndexOf(searchValue[, fromIndex])
                fromIndex = docBody.indexOf("/master.m3u8");
                // preVideoUrl = "https:" + docBody.split(token).pop().split(".m3u8")[0];
                // https://streaming-ondemand.rtp.pt/nas2.share/h264/512x384/p6657/p6657_1_202012201253232792/master [.m3u8]
                // que quero transformar em:
                // https://ondemand.rtp.pt/nas2.share/h264/512x384/p6657/p6657_1_202012201253232792.mp4
                break;
              case ".mp3":
                // "https://cdn-ondemand.rtp.pt/nas2.share/wavrss/at3/2102/PGM2100403403401_355271-2102161509.mp3"
                fromIndex = docBody.indexOf(".mp3"); // preVideoUrl = docBody.split('file: "').pop().split('.mp3')[0];
                break;
            }
            // alguma limpeza
            backToIndex = docBody.lastIndexOf("https://", fromIndex)
            preVideoUrl = docBody.substring(backToIndex, fromIndex);
            preVideoUrl = preVideoUrl.replace(style1, style2); // se ".mp3" é inócuo
            trueVideoUrl = preVideoUrl + mediaType;
            console.log('preVideoUrl: ' + preVideoUrl);
            console.log(`trueVideoUrl: ${trueVideoUrl}`);

            preTitle = docBody.match('(?<=<meta itemprop="name" content=)(.*)(?=>)');
            console.log(`preTtitle: ${preTitle}`);

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
              prefix = `E${contentEpisode[0]}-`;
            }
            let contentDate = docBody.match('(?<=content_date: ")(.*)(?=",)');
            let videoName = `${prefix}${contentTitle[0]}-${contentDate[0]}`;

            videoName = videoName.replace(":", "-");
            console.log(document.readyState); // complete
            console.log(`contentTitle: ${contentTitle[0]}`);
            console.log(`contentEpisode: ${contentEpisode[0]}`);
            console.log(`contentDate: ${contentDate[0]}`);
            console.log(`raw videoName: ${videoName}`);

            // vamos livrar-nos de coisas más dentro do "name":
            videoName = videoName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '') + mediaType; //".mp4";
            resp.vurl = trueVideoUrl;
            resp.name = videoName;

            console.log(`clean videoName: ${videoName}`);
            console.log("EEL resp.vurl: " + resp.vurl);
            console.log("EEL resp.name: " + resp.name);

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
                console.log("batatas");
              }
              let myVideoUrl = obj.vurl;
              let videoName = obj.name;
              console.log('POP message from popup.js:', myVideoUrl);
              console.log('POP message from popup.js:', videoName);
              injectXdiv(obj); // this is in popup.html and adds (several) <div class="
              // testar em OPERA e Firefox
              chrome.downloads.download({
                url: myVideoUrl,
                filename: videoName,
                conflictAction: 'uniquify',
                saveAs: true
              })
              console.log('POP2 message from popup.js:', myVideoUrl);
              console.log('POP2 message from popup.js:', videoName);
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
          console.log("Exists?:" + exists);
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