(defproject callisto "0.1.0-SNAPSHOT"
  :description "FIXME: write description"
  :url "http://example.com/FIXME"
  :min-lein-version "2.0.0"
  :dependencies [[org.clojure/clojure "1.6.0"]
                 [compojure "1.3.1"]
                 [ring/ring-defaults "0.1.2"]
                 [ring/ring-json "0.3.1"]
                 [io.forward/clojure-mail "1.0"]
                 [jarohen/nomad "0.7.0"]
                 [commons-net "3.3"]
                 [javax.mail/mail "1.4.4"]
                 [cheshire "5.4.0"]
                 [ring-cors "0.1.7"]
                 [enlive "1.1.5"]
                 [hiccup "1.0.5"]
                 [hickory "0.5.4"]
                 [clj-time "0.9.0"]
                 ]
  :plugins [[lein-ring "0.8.13"]]
  :ring {:handler callisto.handler/app}
  :profiles
  {:dev {:dependencies [[javax.servlet/servlet-api "2.5"]
                        [ring-mock "0.1.5"]]}})
