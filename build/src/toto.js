'use strict';


module.exports = function pipeline(pplnFactory) {

  let _watchExpression;

  const _builder = {

    watch(watchExpression) {
      _watchExpression = watchExpression;
      return _builder;
    },

    run() {
      if (_watchExpression) {
        gulp.watch(_builder, pplnFactory);
      }

      return pplnFactory();
    }
  };

  return _builder;
};