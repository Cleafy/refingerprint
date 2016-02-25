# Refingerprint

Builds on top of [Fingerprint2](https://github.com/Valve/fingerprintjs2) adding several additional features to further
narrow the browser down. Some of these new features were implemented on the content provided by [Browserspy](http://browserspy.dk)
and other various similar articles that I found on the Internet.

As a recognition to the original author of the library and in order to provide simple compatibility with users
of Fingerprint2js, we left the external library interface intact.

## Installation

#### Bower

```
bower install https://github.com/IcyTotem/refingerprint.git
```

## Usage

```js
new Refingerprint().get(function (result, components) {
  // An hash, representing your device fingerprint: notice that this is twice the size
  // of Fingerprint2 hash, the first 32 bytes being exactly the latter, and the last 32
  // bytes being an hash produced solely based on added features
  console.log(result);
  // An array of FP components
  console.log(components);
});
```

You can pass an object with options (all of which are optional):

```js
var options = {
  swfPath: '/assets/FontList.swf',
  imagesPath: '/assets/images/test'
  excludeWindowDump: true
};
new Refingerprint(options).get(function (result) {
  console.log(result);
});
```

Available options include all those exposed by Fingerprint2, plus the following: `excludeLiteralColors`,
`excludeActivexObjects`, `excludeMsComponents`, `excludeNavigatorDump`, `excludeToolbarDump`, `excludeCryptoDump`,
`excludeWindowDump`, `excludeDocumentDump`, `excludeStyleDump`, `excludeErrorMessages`, `excludeImagesFormats`.

## Added features

1. *Literal colors*: actual rgb value of css colors that can be represented by a literal identifier;
2. *ActiveX object*: detect some common ActiveX objects available on MS browsers (few are replicas of those detected
    by Fingerprint2, others are new);
3. *MS components*: attempts to detect some MS components through ClientCaps integration;
4. *Global objects*: list of native functions implemented by globally accessible objects (window, document, navigator, crypto, toolbar);
5. *CSS dump*: list of all supported css properties;
6. *Error messages*: different browsers/versions exhibit slightly different error messages for the same errors;
7. *Supported image formats*: this is the only asynchronous module and the heaviest one. It is advised to turn it off in most cases.

## License: MIT