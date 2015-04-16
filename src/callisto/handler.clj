(ns callisto.handler
  (:require [compojure.core :refer :all]
            [compojure.route :as route]
            [ring.middleware.defaults :refer [wrap-defaults site-defaults]]
            ;[ring.middleware.json :as middleware]
            [callisto.mail :as mail]
            [callisto.data :as data]
            [callisto.front :as front]
            ;[ring.middleware.cors :refer [wrap-cors]]
            ;[hiccup.core :as hiccup]
            ;[clj-time.core :as time]
            ))

(def root (str (System/getProperty "user.dir") "/public"))


(defroutes app-routes
  (GET "/" []
       (front/frontend))
  (GET "/data" []
       (data/broadcast-mail
        (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/")
        ))
  (route/files "public")
  ;(route/files "/" (do (println root) {:root root}))
  (route/resources "/")
  (route/not-found "Not Found 2"))

(def app
  (wrap-defaults app-routes
                 (assoc-in site-defaults
                           [:security :xss-protection :enable?]
                           false)))

;(def app
;  (wrap-cors (wrap-defaults app-routes site-defaults)
;             :access-control-allow-origin [#"http://localhost"]
;             :access-control-allow-methods [:get :put :post :delete]))

;(data/export-mail
; (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/")
; "resources/front/test.json")

;(data/broadcast-mail
; (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/")
; )
