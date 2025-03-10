// Copyright IBM Corp. 2014,2019. All Rights Reserved.
// Node module: loopback-component-explorer
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

// Refactoring of inline script from index.html.
/*global SwaggerUi, log, ApiKeyAuthorization, hljs, window, $ */
$(function() {
  // Pre load translate...
  if (window.SwaggerTranslator) {
    window.SwaggerTranslator.translate();
  }

  var lsKey = 'swagger_accessToken';
  $.getJSON('config.json', function(config) {
    log(config);
    loadSwaggerUi(config);
  });

  var accessToken;
  function loadSwaggerUi(config) {
    var methodOrder = ['get', 'head', 'options', 'put', 'post', 'delete'];
    /* eslint-disable camelcase */
    window.swaggerUi = new SwaggerUi({
      validatorUrl: null,
      url: config.url || '/swagger/resources',
      apiKey: '',
      auth: config.auth,
      dom_id: 'swagger-ui-container',
      supportHeaderParams: true,
      onComplete: function(swaggerApi, swaggerUi) {
        log('Loaded SwaggerUI');
        log(swaggerApi);
        log(swaggerUi);

        if (window.SwaggerTranslator) {
          window.SwaggerTranslator.translate();
        }

        $('pre code').each(function(i, e) {
          hljs.highlightBlock(e);
        });

        // Recover accessToken from localStorage if present.
        if (window.localStorage) {
          var key = window.localStorage.getItem(lsKey);
          if (key) {
            $('#input_accessToken').val(key).submit();
          }
        }
      },
      onFailure: function(data) {
        log('Unable to Load SwaggerUI');
        log(data);
      },
      docExpansion: 'none',
      highlightSizeThreshold: 16384,
      apisSorter: 'alpha',
      operationsSorter: function(a, b) {
        var pathCompare = a.path.localeCompare(b.path);
        return pathCompare !== 0 ?
          pathCompare :
          methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method);
      },
    });
    /* eslint-disable camelcase */

    $('#explore').click(setAccessToken);
    $('#api_selector').submit(setAccessToken);
    $('#input_accessToken').keyup(onInputChange);

    //window.swaggerUi.load();

    if (window.localStorage) {
      var key = window.localStorage.getItem(lsKey);
      if (key) {  
        checkKey(key, function(){
          window.swaggerUi.load();
        })      
      } 
    }    
  }

  function setAccessToken(e) {
    e.stopPropagation(); // Don't let the default #explore handler fire
    e.preventDefault();
    var authOptions = window.swaggerUi.options.auth || {};
    var keyLocation = authOptions.in || 'query';
    var keyName = authOptions.name || 'access_token';
    var key = $('#input_accessToken')[0].value;
    
    checkKey(key, function(){
      log('key: ' + key);
      if (key && key.trim() !== '') {
        log('added accessToken ' + key);
        var apiKeyAuth =
          new SwaggerClient.ApiKeyAuthorization(keyName, key, keyLocation);
        if(!window.swaggerUi.api) window.swaggerUi.load();
        window.swaggerUi.api.clientAuthorizations.add('key', apiKeyAuth);
        accessToken = key;
        $('.accessTokenDisplay').text('Token Set.').addClass('set');
        $('.accessTokenDisplay').attr('data-tooltip', 'Current Token: ' + key);

        // Save this token to localStorage if we can to make it persist on refresh.
        if (window.localStorage) {
          window.localStorage.setItem(lsKey, key);
        }
      } else {
        // If submitted with an empty token, remove the current token. Can be
        // useful to intentionally remove authorization.
        log('removed accessToken.');
        $('.accessTokenDisplay').text('Token Not Set.').removeClass('set');
        $('.accessTokenDisplay').removeAttr('data-tooltip');
        if (window.swaggerUi) {
          window.swaggerUi.api.clientAuthorizations.remove('key');
        }
        if (window.localStorage) {
          window.localStorage.removeItem(lsKey);
        }
      }
    });    
  }

  function checkKey(key, callback){
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
            const responseObject = JSON.parse(this.response);
            const keyIsValid = responseObject.exists;
            if(!keyIsValid) {
              alert('token is unvalid');
              return;
            } 
            if(callback) callback();
        }
      }
    }

    const url = `${window.location.protocol}//${window.location.host}/api/AccessTokens/${key}/exists`;
    xhr.open('GET', url, true);
    xhr.send();
  }

  function onInputChange(e) {
    var el = e.currentTarget;
    var key = $(e.currentTarget)[0].value;
    if (!key || key.trim === '') return;
    if (accessToken !== key) {
      $('.accessTokenDisplay').text('Token changed; submit to confirm.');
    } else {
      $('.accessTokenDisplay').text('Token Set.');
    }
  }

  function log() {
    if ('console' in window) {
      console.log.apply(console, arguments);
    }
  }
});
