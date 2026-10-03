(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates["components/formField/formField"] = template({"0":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      <button class=\"form-field__toggle\" type=\"button\" data-password-toggle=\""
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"id","hash":{},"data":data,"loc":{"start":{"line":14,"column":77},"end":{"line":14,"column":83}}}) : helper)))
    + "\" aria-label=\"Показать пароль\">\r\n        <svg class=\"form-field__icon form-field__icon--hidden\" width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" aria-hidden=\"true\">\r\n          <path d=\"M14.95 14.9499C13.5255 16.0358 11.791 16.6373 10 16.6666C4.16671 16.6666 0.833374 9.99992 0.833374 9.99992C1.86995 8.06817 3.30765 6.38043 5.05004 5.04992M8.25004 3.53325C8.82365 3.39898 9.41093 3.33187 10 3.33325C15.8334 3.33325 19.1667 9.99992 19.1667 9.99992C18.6609 10.9463 18.0576 11.8372 17.3667 12.6583M11.7667 11.7666C11.5378 12.0122 11.2618 12.2092 10.9552 12.3459C10.6485 12.4825 10.3175 12.556 9.98178 12.5619C9.64611 12.5678 9.31268 12.5061 9.00138 12.3803C8.69009 12.2546 8.40731 12.0674 8.16991 11.83C7.93252 11.5927 7.74537 11.3099 7.61963 10.9986C7.4939 10.6873 7.43215 10.3539 7.43807 10.0182C7.44399 9.6825 7.51746 9.35146 7.6541 9.04479C7.79074 8.73813 7.98775 8.46213 8.23337 8.23325M0.833374 0.833252L19.1667 19.1666\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\r\n        </svg>\r\n        <svg class=\"form-field__icon form-field__icon--visible\" width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" aria-hidden=\"true\">\r\n          <path d=\"M0.83 10C0.83 10 4.17 3.33 10 3.33C15.83 3.33 19.17 10 19.17 10C19.17 10 15.83 16.67 10 16.67C4.17 16.67 0.83 10 0.83 10Z\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\r\n          <circle cx=\"10\" cy=\"10\" r=\"2.5\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\r\n        </svg>\r\n      </button>\r\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"form-field\">\r\n  <label class=\"form-field__label\" for=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":2,"column":40},"end":{"line":2,"column":46}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"label") || (depth0 != null ? lookupProperty(depth0,"label") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"label","hash":{},"data":data,"loc":{"start":{"line":2,"column":48},"end":{"line":2,"column":57}}}) : helper)))
    + "</label>\r\n  <div class=\"form-field__control\">\r\n    <input\r\n      class=\"form-field__input\"\r\n      id=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":6,"column":10},"end":{"line":6,"column":16}}}) : helper)))
    + "\"\r\n      name=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":7,"column":12},"end":{"line":7,"column":20}}}) : helper)))
    + "\"\r\n      type=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"type") || (depth0 != null ? lookupProperty(depth0,"type") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"type","hash":{},"data":data,"loc":{"start":{"line":8,"column":12},"end":{"line":8,"column":20}}}) : helper)))
    + "\"\r\n      autocomplete=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"autocomplete") || (depth0 != null ? lookupProperty(depth0,"autocomplete") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"autocomplete","hash":{},"data":data,"loc":{"start":{"line":9,"column":20},"end":{"line":9,"column":36}}}) : helper)))
    + "\"\r\n      placeholder=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"placeholder") || (depth0 != null ? lookupProperty(depth0,"placeholder") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"placeholder","hash":{},"data":data,"loc":{"start":{"line":10,"column":19},"end":{"line":10,"column":34}}}) : helper)))
    + "\"\r\n      aria-describedby=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":11,"column":24},"end":{"line":11,"column":30}}}) : helper)))
    + "-error\"\r\n    />\r\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"passwordToggle") : depth0),{"name":"if","hash":{},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":13,"column":4},"end":{"line":23,"column":11}}})) != null ? stack1 : "")
    + "  </div>\r\n  <p class=\"form-field__error\" id=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":25,"column":35},"end":{"line":25,"column":41}}}) : helper)))
    + "-error\" data-error-for=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":25,"column":65},"end":{"line":25,"column":73}}}) : helper)))
    + "\" aria-live=\"polite\"></p>\r\n</div>\r\n";
},"useData":true});
templates["components/header/header"] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<header class=\"header\">\r\n  <a href=\"/profile\" data-link>Профиль</a>\r\n  <a href=\"/login\" data-link>Вход</a>\r\n  <a href=\"/register\" data-link>Регистрация</a>\r\n</header>\r\n";
},"useData":true});
templates["components/logo/logo"] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<svg class=\"logo\" width=\"100\" height=\"162\" viewBox=\"0 0 100 162\" fill=\"none\" aria-hidden=\"true\">\r\n  <path d=\"M0 53C0 28.1472 20.1472 8 45 8H50C77.6142 8 100 30.3858 100 58C100 85.6142 77.6142 108 50 108H0V53Z\" fill=\"#E07A5F\"/>\r\n  <path d=\"M25 58C25 44.1929 36.1929 33 50 33C63.8071 33 75 44.1929 75 58C75 71.8071 63.8071 83 50 83H25V58Z\" fill=\"white\"/>\r\n  <path d=\"M0 59H27V114H0V59Z\" fill=\"white\"/>\r\n  <path d=\"M24 58H28V62H24V58Z\" fill=\"white\"/>\r\n  <path d=\"M0 103C0 91.9543 8.95431 83 20 83H30V153H0V103Z\" fill=\"#E07A5F\"/>\r\n  <path d=\"M0 58H25V59.1667C25 70.6726 15.6726 80 4.16667 80C1.86548 80 0 78.1345 0 75.8333V58Z\" fill=\"#E07A5F\"/>\r\n  <path d=\"M25 108H51V154H25V108Z\" fill=\"white\"/>\r\n  <path d=\"M25 108H39V122H25V108Z\" fill=\"#E07A5F\"/>\r\n  <path d=\"M0 124H26V154H0V124Z\" fill=\"white\"/>\r\n  <path d=\"M0 108H25V133.167C25 144.673 15.6726 154 4.16667 154C1.86548 154 0 152.135 0 149.833V108Z\" fill=\"#E07A5F\"/>\r\n  <path d=\"M25 119C25 112.925 29.9249 108 36 108H71V154H25V119Z\" fill=\"white\"/>\r\n</svg>\r\n";
},"useData":true});
templates["pages/login/login"] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<section class=\"page page--auth\">\r\n  <form class=\"auth-form\" id=\"login-form\" novalidate>\r\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"logo"),depth0,{"name":"logo","data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "    <div class=\"auth-form__header\">\r\n      <h1 class=\"auth-form__title\">С возвращением!</h1>\r\n      <p class=\"auth-form__subtitle\">Войдите в аккаунт, чтобы продолжить</p>\r\n    </div>\r\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"formField"),depth0,{"name":"formField","hash":{"placeholder":"email@example.com","autocomplete":"username","label":"Адрес электронной почты или имя пользователя","type":"text","name":"login","id":"login-user"},"data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = container.invokePartial(lookupProperty(partials,"formField"),depth0,{"name":"formField","hash":{"passwordToggle":true,"placeholder":"••••••••","autocomplete":"current-password","label":"Пароль","type":"password","name":"password","id":"login-password"},"data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "    <p class=\"form-field__error\" data-form-error aria-live=\"polite\"></p>\r\n    <button class=\"button button--primary\" type=\"submit\">Войти</button>\r\n    <a class=\"button button--secondary\" href=\"/register\" data-link>Создать новый аккаунт</a>\r\n  </form>\r\n</section>\r\n";
},"usePartial":true,"useData":true});
templates["pages/notFound/notFound"] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<section class=\"page page--not-found\">\r\n  <h1 class=\"page__title\">Страница не найдена</h1>\r\n  <p class=\"page__text\">Такой страницы не существует.</p>\r\n</section>\r\n";
},"useData":true});
templates["pages/profile/profile"] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<section class=\"page page--profile\">\r\n  <h1 class=\"page__title\">Профиль</h1>\r\n  <p class=\"page__text\">Страница профиля в разработке.</p>\r\n</section>\r\n";
},"useData":true});
templates["pages/register/register"] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<section class=\"page page--auth\">\r\n  <form class=\"auth-form\" id=\"register-form\" novalidate>\r\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"logo"),depth0,{"name":"logo","data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "    <div class=\"auth-form__header\">\r\n      <h1 class=\"auth-form__title\">Добро пожаловать!</h1>\r\n      <p class=\"auth-form__subtitle\">Создайте аккаунт, чтобы начать</p>\r\n    </div>\r\n"
    + ((stack1 = container.invokePartial(lookupProperty(partials,"formField"),depth0,{"name":"formField","hash":{"placeholder":"email@example.com","autocomplete":"email","label":"Адрес электронной почты","type":"email","name":"email","id":"register-email"},"data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = container.invokePartial(lookupProperty(partials,"formField"),depth0,{"name":"formField","hash":{"placeholder":"ivan_petrov","autocomplete":"username","label":"Имя пользователя","type":"text","name":"username","id":"register-username"},"data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = container.invokePartial(lookupProperty(partials,"formField"),depth0,{"name":"formField","hash":{"placeholder":"Иван Петров","autocomplete":"name","label":"Отображаемое имя","type":"text","name":"nickname","id":"register-nickname"},"data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = container.invokePartial(lookupProperty(partials,"formField"),depth0,{"name":"formField","hash":{"passwordToggle":true,"placeholder":"••••••••","autocomplete":"new-password","label":"Пароль","type":"password","name":"password","id":"register-password"},"data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = container.invokePartial(lookupProperty(partials,"formField"),depth0,{"name":"formField","hash":{"passwordToggle":true,"placeholder":"••••••••","autocomplete":"new-password","label":"Повторите пароль","type":"password","name":"passwordRepeat","id":"register-password-repeat"},"data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "    <p class=\"form-field__error\" data-form-error aria-live=\"polite\"></p>\r\n    <button class=\"button button--primary\" type=\"submit\">Зарегистрироваться</button>\r\n    <a class=\"button button--secondary\" href=\"/login\" data-link>У меня уже есть аккаунт</a>\r\n  </form>\r\n</section>\r\n";
},"usePartial":true,"useData":true});
})();