sources = [
	"src/html/unit_test.html",
	"src/html/main.html",
  "src/core/typesystem.js",
  "src/config/config.js",
  "src/core/const.js",
  "src/util/object_cache.js",
	"tools/utils/crypto/sha1.js",
  "tools/utils/libs/lz-string/libs/base64-string-v1.1.0.js",
  "tools/utils/libs/lz-string/libs/lz-string-1.3.3.js",
  "src/core/startup_file.js",
	"src/core/webgl-debug.js",
	"src/core/webgl-utils.js",
  "src/util/base_vector.js",
  "src/datafiles/icon_enum.js",
  "src/util/vector.js",
	"src/core/J3DIMath.js",
	"src/core/J3DI.js",
	"src/util/utils.js",
  "src/util/strutils.js",
  "src/util/workerutils.js",
	"src/core/lib_api.js",
	"src/util/mathlib.js",
	"src/util/parseutil.js",
	"src/util/jslzjb.js",
  "src/core/tarray_alloc.js",
	"src/core/jobs.js",
	"src/font/fontgen10.js",
	"src/font/fontgen12.js",
	"src/font/fontgen14.js",
	"src/core/ajax.js",
  "src/core/raster.js",
	"src/core/AppState.js",
	"src/core/units.js",
	"src/core/data_api.js",
	"src/core/schema.js",
	"src/core/fileapi.js",
  
  "src/view3d/events.js",
  "src/ui/touchevents.js",
  
  "src/core/toolprops.js",
  "src/core/toolprops_iter.js",
  "src/view3d/toolops_unit_test.js",
	"src/core/toolops_api.js",
  
  "src/mesh/mesh_types.js",
	"src/mesh/mesh.js",
  "src/mesh/mesh_api.js",
	"src/mesh/opsapi.js",
	"src/mesh/esubdivide.js",
	"src/mesh/triangulate_job.js",
  "src/mesh/triangulate_worker.js",
	"src/mesh/geodata.js",
  
	"src/mesh/triangulate.js",
	"src/mesh/subsurf.js",
  
	"src/core/lib_utils.js",

	"src/mesh/meshtools_cad.js",
	"src/mesh/meshtools_loop.js",
	"src/mesh/meshtools_create.js",

  "src/exporters/export_stl.js",
  "src/view3d/transform.js",
	"src/view3d/trans_ops.js",
	"src/view3d/trans_ops_special.js",
	"src/view3d/fontutils.js",
	"src/view3d/grid.js",
  "src/ui/theme.js",
	"src/view3d/draw.js",
  "src/view3d/tutorial_mode.js",
	"src/ui/UIElement.js",
  "src/ui/UICanvas.js",
  "src/ui/UIFrame.js",
  "src/ui/UIPack.js",
  "src/ui/icon.js",
	"src/ui/UIWidgets.js",
	"src/ui/UIMenu.js",
	"src/ui/RadialMenu.js",
  "src/ui/UIWidgets_special.js",
  "src/core/utildefine.js",
	"src/view3d/dialog.js",
	"src/view3d/dialogs.js",
	"src/view3d/FrameManager.js",

  "src/view3d/notifications.js",

	"src/util/dag.js",
	"src/util/dag_utils.js",
  "src/shaders/csg_vshader.js",
  "src/shaders/csg_fshader.js",
  "src/view3d/fbo.js",
	"src/view3d/view3d.js",
	"src/view3d/view3d_ops.js",
	"src/view3d/select_ops.js",
  "src/object/csg.js",
  "src/view3d/view3d_csg.js",
  "src/view3d/view3d_object_ops.js",
	"src/view3d/view3d_mesh_ops.js",
	"src/object/object.js",
	"src/object/scenegraph.js",
	"src/object/scene.js",
	"src/object/object_ops.js",
	"src/core/data_api_define.js",
  
  "src/font/fontgen10.png",
  "src/font/fontgen12.png",
  "src/font/fontgen14.png",
  "src/datafiles/iconsheet.svg",
  "src/datafiles/iconsheet.png",
  "src/datafiles/iconsheet16.png"
]

copy_targets = {
   "jasmine.js"      : "tools/utils/libs/jasmine/lib/jasmine.js",
   "jasmine-html.js" : "tools/utils/libs/jasmine/lib/jasmine-html.js",
   "jasmine-console.js"      : "tools/utils/libs/jasmine/lib/console.js",
   "jasmine_boot.js"         : "src/unit_tests/jasmine_boot.js"
}

js_targets = {"app.js"        : sources,
              "unit_tests.js" : [
               ] + sources + [
                 "src/unit_tests/tests.js"
               ],
               "alloc_test.js" : [
                "src/core/typesystem.js",
                "src/util/utils.js",
                "src/core/tarray_alloc.js"
               ]
             }

