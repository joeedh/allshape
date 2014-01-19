<html>
<script>
function range(a, b) {
   this.frame_3_cur = 0;
   this.frame_3_frames = 0;
   this.frame_3_scope = 0;
   this.frame_2_cur = 0;
   this.frame_2_frames = 0;
   this.frame_2_scope = 0;
   this.frame_1_cur = 0;
   this.frame_1_frames = 0;
   this.frame_1_scope = 0;
   this.frame_0_cur = 0;
   this.frame_0_frames = 0;
   this.frame_0_scope = 0;
   this.__iterator__ = function() {
    return this;
   }
   this.first = true;
   this.next = function() {
    var this2=this;
    with (this) {
      with (this.frame_0_scope) {
        if (first) {
          frame_0_scope = {i_2: undefined, b_0: undefined, a_0: undefined}
          frame_1_scope = {i_2: undefined, b_0: undefined, a_0: undefined}
          frame_2_scope = {a_0: undefined, b_0: undefined, i_2: undefined}
          frame_3_scope = {a_0: undefined, b_0: undefined, i_2: undefined}
        }
        function frame_1() {
         with (frame_1_scope) {
           if (b_0==undefined) {
             b_0 = a_0;
             a_0 = 0;
           }
           var i_2 = a_0;
         }
        }
        function frame_2() {
         with (frame_2_scope) {
           for (; i_2<b_0; i_2++) {
             function frame_3() {
              with (frame_3_scope) {
                return i_2;
              }
             }
             if (first) {
               this2.frame_2_frames=[frame_3];
             }
             var ret;
             while ((ret=frame_2_frames[frame_2_cur]())==undefined) {
              frame_2_cur++;
              if (frame_2_cur>=frame_2_frames.length)
               break;
             }
             if (frame_2_cur>=frame_2_frames.length||ret==FrameContinue) {
               frame_2_cur = 0;
             }
             if (ret==FrameBreak) {
               break;
             }
             else 
              if (ret!=undefined) {
               return ret;
             }
           }
         }
        }
        if (first) {
          frame_0_cur = 0;
          frame_1_cur = 0;
          frame_2_cur = 0;
          frame_3_cur = 0;
          first = false;
        }
        var ret;
        while (frame_3.cur<frame_3_frames.length&&((ret=frame_3_frames[frame_3_cur]())==undefined)) {
         frame_3_cur++;
        }
        if (ret!=undefined)
         return ret;
        throw StopIteration;
      }
    }
   }
  }
</script>
</html>