const template = function() { function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "<html lang=\"en\">\n  <head>\n    <title>Nested Loops Template</title>\n  </head>\n <body>\n    ";
(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : context.getBlock("header"))(env, context, frame, runtime, function(t_2,t_1) {
if(t_2) { cb(t_2); return; }
output += t_1;
output += "\n\n    ";
frame = frame.push();
var t_5 = runtime.contextOrFrameLookup(context, frame, "items");
if(t_5) {t_5 = runtime.fromIterator(t_5);
var t_4 = t_5.length;
for(var t_3=0; t_3 < t_5.length; t_3++) {
var t_6 = t_5[t_3];
frame.set("x", t_6);
frame.set("loop.index", t_3 + 1);
frame.set("loop.index0", t_3);
frame.set("loop.revindex", t_4 - t_3);
frame.set("loop.revindex0", t_4 - t_3 - 1);
frame.set("loop.first", t_3 === 0);
frame.set("loop.last", t_3 === t_4 - 1);
frame.set("loop.length", t_4);
output += "\n      ";
(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : context.getBlock("inloop"))(env, context, frame, runtime, function(t_8,t_7) {
if(t_8) { cb(t_8); return; }
output += t_7;
output += "\n    ";
});
}
}
frame = frame.pop();
output += "\n  </body>\n</html>";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
});
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
function b_header(env, context, frame, runtime, cb) {
var lineno = 5;
var colno = 7;
var output = "";
try {
var frame = frame.push(true);
output += "\n      <h1>";
output += runtime.suppressValue(env.getFilter("upperx").call(context, runtime.contextOrFrameLookup(context, frame, "headerText")), env.opts.autoescape);
output += "</h1>\n    ";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
function b_inloop(env, context, frame, runtime, cb) {
var lineno = 10;
var colno = 9;
var output = "";
try {
var frame = frame.push(true);
output += "\n        <p id=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "x"), env.opts.autoescape);
output += "\">";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "x"), env.opts.autoescape);
output += "</p>\n      ";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
b_header: b_header,
b_inloop: b_inloop,
root: root
};
 }();

export default template;