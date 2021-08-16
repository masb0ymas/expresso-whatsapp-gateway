import * as ModuleAlias from 'module-alias'

ModuleAlias.addAliases({
  '@expresso': `${__dirname}/@expresso`,
  '@config': `${__dirname}/config`,
  '@controllers': `${__dirname}/controllers`,
  '@jobs': `${__dirname}/jobs`,
  '@middlewares': `${__dirname}/middlewares`,
  '@migrations': `${__dirname}/migrations`,
  '@models': `${__dirname}/models`,
  '@routes': `${__dirname}/routes`,
  '@utils': `${__dirname}/utils`,
  '@views': `${__dirname}/views`,
})
