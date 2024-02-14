const template = function() { function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "<html lang=\"en\">\n  <head>\n    <title>Fragments Template</title>\n  </head>\n  <body>";
(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : context.getBlock("level1"))(env, context, frame, runtime, function(t_2,t_1) {
if(t_2) { cb(t_2); return; }
output += t_1;
output += "</body>\n</html>";
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
function b_level1(env, context, frame, runtime, cb) {
var lineno = 5;
var colno = 8;
var output = "";
try {
var frame = frame.push(true);
output += "\n      <h1>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "lvl1"), env.opts.autoescape);
output += "</h1>";
context.getBlock("level2")(env, context, frame, runtime, function(t_4,t_3) {
if(t_4) { cb(t_4); return; }
output += t_3;
output += "<h1>End H1</h1>\n    ";
cb(null, output);
});
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
function b_level2(env, context, frame, runtime, cb) {
var lineno = 7;
var colno = 10;
var output = "";
try {
var frame = frame.push(true);
output += "\n        <h2>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "lvl2"), env.opts.autoescape);
output += "</h2>";
context.getBlock("level3")(env, context, frame, runtime, function(t_6,t_5) {
if(t_6) { cb(t_6); return; }
output += t_5;
output += "<h2>End H2</h2>\n      ";
cb(null, output);
});
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
function b_level3(env, context, frame, runtime, cb) {
var lineno = 9;
var colno = 12;
var output = "";
try {
var frame = frame.push(true);
output += "\n          <h3>";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "lvl3"), env.opts.autoescape);
output += "</h3>\n        ";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
b_level1: b_level1,
b_level2: b_level2,
b_level3: b_level3,
root: root
};
 }();

export default template;