(ns arktikos.mail
  (:require [clojure-mail.core :as clj-mail]
            [clojure-mail.message :as message]
            [clojure-mail.folder :as folder]
            [nomad :refer [defconfig]]
            [clojure.java.io :as io]
            [clojure.string]
            [clojure.pprint]
            [clojure.core.memoize])
  (:import [javax.mail.internet MimeMessage
                                 MimeMultipart
                                 InternetAddress]
           [javax.mail Message Folder Store]
           ))

;;;
;;; Configuration
;;;

; TODO: change this to something reasonable
(defconfig my-config (io/resource "config/config_tower.edn"))

(defn gmail-username []
  (get (my-config) :gmail-username))

(defn gmail-password []
  (get (my-config) :gmail-password))

(defn gmail-folder []
  (get (my-config) :gmail-folder))

(defn get-new-redactions []
  (apply merge
         (map
          (fn [[k v]] {(re-pattern (clojure.string/lower-case k)) v})
          (get (my-config) :redactions))))

;; Cache redactions, so we don't have to keep yanking them from the config files
(def get-redactions (clojure.core.memoize/ttl get-new-redactions {} :ttl/threshold 10))

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

(defn strip-email
  "Email addresses are returned as targets (http://cr.yp.to/immhf/addrlist.html#target-list).
  One possible format for a target is an optional phrase followed by the address in
  angled brackets, like so: 'Name <name@gmail.com>'. Because the identifying phrases can
  be inconsistant, this is annoying for our purposes, so this function strips those off
  and returns the naked address."
  [address]
  (clojure.string/lower-case
   (let [rx (re-find #"<\S+>" address)]
     (if rx
       (subs rx (inc (.indexOf rx "<")) (.indexOf rx ">"))
         address))))

(defn strip-email-square-brackets [address]
  (let [rx (re-find #"\[\S+\]" address)]
    (if rx
      (subs rx (inc (.indexOf rx "[")) (.indexOf rx "]"))
      address
      )))

(defn redact-addresses
  "Replace the addresses with aliases (presumably from the config files)."
  [address redactions]
  (reduce #(apply clojure.string/replace %1 %2)
          address
          redactions))

(defn strip-emails
  "Strip and redact a bunch of emails."
  [addresses redactions]
  (map #(redact-addresses (strip-email-square-brackets (strip-email %1)) redactions) addresses))


(defn hash-message
  "Take an email and convert it to the hashmap format the data processing understands."
  [m]
  {:mail/id (message/id m)
   ;:mail/to (redact-addresses (strip-email (message/to m)) (get-redactions))
   :mail/from (redact-addresses (strip-email (message/from m) ) (get-redactions))
   :mail/subject (message/subject m)
   ;:mail/sender (redact-addresses (strip-email (message/sender m)) (get-redactions))
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
                          (flatten (conj (cc-list m) (bcc-list m) (message/to m)))
                          (get-redactions))
                         ;(moderator-name))
   ;:mail/read-message (message/read-message m)
   })

(defn process-message
  "Take a path to a file containing a single email, convert it for data processing."
  [path-to-message]
  (let [m (try
                  (clj-mail/file->message path-to-message)
                  (catch java.io.FileNotFoundException e))]
    (if (not (nil? m))
      (hash-message m))))

(defn ingest-mail
  "Get messages from disk, returning a format that the data processing understands.
  Local complement to (remote-mail)."
  [mail-folder-path]
  (remove nil?
  (map process-message
     (map #(.getPath %1)
          (file-seq (io/file mail-folder-path))))))

(defn transactions-sent [msgs]

  (group-by :mail/from msgs))


;;;
;;; Remote Mail
;;;

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

(defn remote-mail
  "Get mail from the remote server, return it for data processing.
  Remote complement to (ingest-mail)."
  []
  (clojure.pprint/pprint "accessing remote mail...")
  (map process-remote-message
        (clojure-mail.core/with-store (clojure-mail.core/gen-store (gmail-username) (gmail-password))
         (.getMessages (my-open-folder (gmail-folder) :readonly))
                  )))

(defn remote-mail
  "Get mail from the remote server, return it for data processing.
  Remote complement to (ingest-mail)."
  ([] (remote-mail (gmail-folder)))
  ([folder-name]
   (clojure.pprint/pprint (str "Accessing remote mail: " folder-name))
   (if (vector? folder-name)
     (mapcat #(remote-mail %1) folder-name)
     (map process-remote-message
           (clojure-mail.core/with-store (clojure-mail.core/gen-store (gmail-username) (gmail-password))
             (.getMessages (my-open-folder folder-name :readonly))
                  )))))

;; Cache the fetched mail, because we really don't need real-time updates yet...
(def cached-remote-mail
  (clojure.core.memoize/ttl remote-mail {} :ttl/threshold 60))


;(remote-mail)

;(process-remote-message

;(clojure-mail.core/with-store (clojure-mail.core/gen-store gmail-username gmail-password)
; (.open (.getFolder clojure-mail.core/*store* "INBOX") Folder/READ_ONLY
;  ))


;(clojure-mail.core/with-store (clojure-mail.core/gen-store gmail-username gmail-password)
;  ;(clojure-mail.core/folders clojure-mail.core/*store*)
;  (process-remote-message
;   (first (.getMessages (my-open-folder "Callisto/Colony/Letters/Missives" :readonly))
;          )))












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


