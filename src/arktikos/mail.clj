(ns arktikos.mail
  (:require [clojure-mail.core :as clj-mail]
            [clojure-mail.message :as message]
            [clojure-mail.folder :as folder]
            [nomad :refer [defconfig]]
            [clojure.java.io :as io]
            [clojure.string]
            [clojure.pprint]

            )
  (:import [javax.mail.internet MimeMessage
                                 MimeMultipart
                                 InternetAddress]
           [javax.mail Message Folder Store]
           )
   )


;;;
;;; Configuration
;;;

(defconfig my-config (io/resource "config/config_testing.edn"))

(def gmail-username (get (my-config) :gmail-username))
(def gmail-password (get (my-config) :gmail-password))

(def redactions
  (apply merge
         (map
          (fn [[k v]] {(re-pattern (clojure.string/lower-case k)) v})
          (get (my-config) :redactions))))

;;;
;;; Mail Data Formatting
;;;

(defn get-sent-date [msg]
  (.getSentDate msg))
(defn get-recieved-date [msg]
  (.getReceivedDate msg))
(defn cc-list [msg]
  (map str (.getRecipients msg javax.mail.Message$RecipientType/CC)))
(defn bcc-list [msg]
  (map str (.getRecipients msg javax.mail.Message$RecipientType/BCC)))

(defn simple-content-type [full-content-type]
  (-> full-content-type
      (clojure.string/split #"[;]")
      (first)
      (clojure.string/lower-case)))
(defn is-content-type? [body requested-type]
  (= (simple-content-type (:content-type body))
     requested-type))
(defn find-body-of-type [bodies type]
  (:body (first (filter #(is-content-type? %1 type) bodies))))
(defn get-text-body [msg]
  (find-body-of-type (message/message-body msg) "text/plain"))
(defn get-html-body [msg]
  (find-body-of-type (message/message-body msg) "text/html"))

;(message/read-message
; (clj-mail/file->message (.getPath (second (file-seq
; (io/file "mail/Book One_20150404-0926/messages/")
; )))))

;(defn moderator-name []
;  "isaackarth@gmail.com")

;(defn strip-moderator [addresses mod-name]
;  (remove #(= %1 mod-name) addresses)
;     )

(defn strip-email [address]
  (clojure.string/lower-case
   (let [rx (re-find #"<\S+>" address)]
     (if rx
       (subs rx (inc (.indexOf rx "<")) (.indexOf rx ">"))
         address))))

(defn redact-addresses [address redactions]
  (reduce #(apply clojure.string/replace %1 %2)
          address
          redactions))

(defn strip-emails [addresses]
  (map #(redact-addresses (strip-email %1) *redactions*) addresses))


(defn hash-message [m]
  {;:mail/id (message/id m)
   ;:mail/to (redact-addresses (strip-email (message/to m)) redactions)
   :mail/from (redact-addresses (strip-email (message/from m)) redactions)
   :mail/subject (message/subject m)
   ;:mail/sender (redact-addresses (strip-email (message/sender m)) redactions)
   ;:mail/cc (strip-emails (cc-list m))
   ;:mail/bcc (strip-emails (bcc-list m))
   :mail/date-sent (get-sent-date m)
   ;:mail/date-received (get-recieved-date m)
   ;:mail/flags (message/flags m)
   ;:mail/mime-type (message/mime-type m)
   ;:mail/content-type (message/content-type m)
   ;:mail/text-body (get-text-body m)
   ;:mail/html-body (get-html-body m)
   :mail/reception-list ;(strip-moderator
                         (strip-emails
                          (flatten (conj (cc-list m) (message/to m))))
                         ;(moderator-name))
   ;:mail/read-message (message/read-message m)
   })

(defn process-message [path-to-message]
  (let [m (try
                  (clj-mail/file->message path-to-message)
                  (catch java.io.FileNotFoundException e))]
    (if (not (nil? m))
      (hash-message m))))

;(nth (map process-message
;     (map #(.getPath %1) (file-seq (io/file "mail/Book One_20150404-0926/messages/")))
;     ) 2)

(defn ingest-mail [mail-folder-path]
  (remove nil?
  (map process-message
     (map #(.getPath %1)
          (file-seq (io/file mail-folder-path))))))

;(ingest-mail "mail/Book One_20150404-0926/messages/")
(defn transactions-sent [msgs]

  (group-by :mail/from msgs))


;;;
;;; Remote Mail
;;;

;(get {:x 1 :y 2} :x)

(defn hash-message-remote [m]
  {;:mail/id (message/id m)
   ;:mail/to (strip-email (get m :to "X"))
   :mail/from (redact-addresses (strip-email (message/from m)) *redactions*)
   ;:mail/subject (message/subject m)
   ;:mail/sender (redact-addresses (strip-email (message/sender m)) *redactions*)
   ;:mail/cc (strip-emails (cc-list m))
   ;:mail/bcc (strip-emails (bcc-list m))
   ;:mail/date-sent (get-sent-date m)
   ;:mail/date-received (get-recieved-date m)
   ;:mail/flags (message/flags m)
   ;:mail/mime-type (message/mime-type m)
   ;:mail/content-type (message/content-type m)
   ;:mail/text-body (get-text-body m)
   ;:mail/html-body (get-html-body m)
   ;:mail/reception-list ;(strip-moderator
   ;                      (strip-emails
   ;                       (flatten (conj (cc-list m) (message/to m))))
   ;                      ;(moderator-name))
   ;:mail/read-message (message/read-message m)
   :m m
   })


;(def mystore (clojure-mail.core/gen-store gmail-username gmail-password))
;(def inbox-messages (inbox mystore))

;(clojure-mail.core/open-folder mystore :inbox :readonly)
;(folder/list (clojure-mail.core/open-folder mystore :inbox :readonly)
;             )

;(get-folder mystore "Callisto")
;(open-folder mystore :all)
;(message/read-message
; (first (take 5 (clojure-mail.core/all-messages
;                 (clojure-mail.core/gen-store gmail-username gmail-password) :sent)))
;                 )



;(clojure-mail.core/open-folder mystore "[Gmail]/Callisto" :readonly)


(defn process-remote-message [m]
  (hash-message m))

(defn my-open-folder
  "Open a folder."
  ([folder-name perm-level] (my-open-folder clojure-mail.core/*store* folder-name perm-level))
  ([store folder-name perm-level]
     (let [folder folder-name]
       (let [root-folder (.getDefaultFolder store)
             found-folder (clojure-mail.core/get-folder root-folder folder)]
         (doto found-folder
           (.open (get clojure-mail.core/folder-permissions perm-level)))))))



;(defn remote-mail []
;  (clojure.pprint/pprint "accessing remote mail...")
;  (map process-remote-message
;       (take 25
;             ;(clojure-mail.core/all-messages
;             ; (clojure-mail.core/gen-store gmail-username gmail-password) :sent)
;             (clojure-mail.core/search-inbox
;              (clojure-mail.core/gen-store gmail-username gmail-password)
;              "Colony of Callisto"))))

(defn remote-mail []
  (clojure.pprint/pprint "accessing remote mail...")
  (map process-remote-message
       ;(take 25
        (clojure-mail.core/with-store (clojure-mail.core/gen-store gmail-username gmail-password)
         ;(clojure-mail.core/folders clojure-mail.core/*store*)
         (.getMessages (my-open-folder "Callisto/Colony/Letters/Missives" :readonly))
                  )))



;(remote-mail)

;(process-remote-message

;(clojure-mail.core/with-store (clojure-mail.core/gen-store gmail-username gmail-password)
; (.open (.getFolder clojure-mail.core/*store* "INBOX") Folder/READ_ONLY
;  ))


(clojure-mail.core/with-store (clojure-mail.core/gen-store gmail-username gmail-password)
  ;(clojure-mail.core/folders clojure-mail.core/*store*)
  (process-remote-message
   (first (.getMessages (my-open-folder "Callisto/Colony/Letters/Missives" :readonly))
          )))

;(first (.getMessages
;(clojure-mail.core/open-folder
; (clojure-mail.core/gen-store gmail-username gmail-password)
;         :all :readonly)))
;(first downloaded-mail)
 ;)


;(map #(count (second %))
;  (transactions-sent
; (ingest-mail "mail/Book One_20150404-0926/messages/"))
;     )
;(remove nil? (ingest-mail "mail/Book One_20150404-0926/messages/"
;             ))

;(defn hash-message [m]
  ;(hash-message-remote (message/read-message m))
  ;(message/read-message m)
 ; (hash-message-remote m)
 ; )


;(defn strip-email [address]
;  ;(clojure.string/lower-case
;  ; (let [rx (re-find #"<\S+>" address)]
;  ;   (if rx
;  ;     (subs rx (inc (.indexOf rx "<")) (.indexOf rx ">"))
;  ;       address)))
;  address
;  )


;(defn ingest-mail [mail-folder-path]
;  (remove nil?
;  (map process-message
;       (take 2
;     (map #(.getPath %1)
;          (file-seq (io/file mail-folder-path)))
;        ))))


;(ingest-mail "resources/mail/Book One_20150404-0926/messages/"
;             )


