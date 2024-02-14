const template = function() { function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "<html lang=\"en\">\n  <head>\n    <title>Messy Fragments Template</title>\n  </head>\n  <body>\n\n    ";
(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : context.getBlock("nobreaks"))(env, context, frame, runtime, function(t_2,t_1) {
if(t_2) { cb(t_2); return; }
output += t_1;
output += "\n    \n    ";
(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : context.getBlock("leadbreak"))(env, context, frame, runtime, function(t_4,t_3) {
if(t_4) { cb(t_4); return; }
output += t_3;
output += "\n    \n    ";
(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : context.getBlock("endbreak"))(env, context, frame, runtime, function(t_6,t_5) {
if(t_6) { cb(t_6); return; }
output += t_5;
(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : context.getBlock("extravalues"))(env, context, frame, runtime, function(t_8,t_7) {
if(t_8) { cb(t_8); return; }
output += t_7;
output += "\n\n    ";
(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : context.getBlock("splitblock"))(env, context, frame, runtime, function(t_10,t_9) {
if(t_10) { cb(t_10); return; }
output += t_9;
output += "\n  </body>\n</html>";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
})})})})});
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
function b_nobreaks(env, context, frame, runtime, cb) {
var lineno = 6;
var colno = 7;
var output = "";
try {
var frame = frame.push(true);
output += "<h1>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "text"), env.opts.autoescape);
output += "</h1>";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
function b_leadbreak(env, context, frame, runtime, cb) {
var lineno = 8;
var colno = 7;
var output = "";
try {
var frame = frame.push(true);
output += "<h2>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "text"), env.opts.autoescape);
output += "</h2>";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
function b_endbreak(env, context, frame, runtime, cb) {
var lineno = 11;
var colno = 7;
var output = "";
try {
var frame = frame.push(true);
output += "<h3>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "text"), env.opts.autoescape);
output += "</h3>\n    ";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
function b_extravalues(env, context, frame, runtime, cb) {
var lineno = 14;
var colno = 7;
var output = "";
try {
var frame = frame.push(true);
output += "\n    <h4>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "text"), env.opts.autoescape);
output += "</h4>";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
function b_splitblock(env, context, frame, runtime, cb) {
var lineno = 19;
var colno = 6;
var output = "";
try {
var frame = frame.push(true);
output += "<h5>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "text"), env.opts.autoescape);
output += "</h5>\n    ";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
b_nobreaks: b_nobreaks,
b_leadbreak: b_leadbreak,
b_endbreak: b_endbreak,
b_extravalues: b_extravalues,
b_splitblock: b_splitblock,
root: root
};
 }();

export default template;