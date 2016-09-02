##
# This file is part of WhatWeb and may be subject to
# redistribution and commercial restrictions. Please see the WhatWeb
# web site for more information on licensing and terms of use.
# http://www.morningstarsecurity.com/research/whatweb
#
Plugin.define "Social-plugins" do
  author "Arsen A. Gutsal <arsen@softsky.com.ua>" # 2016-08-11
  version "0.1"
  description "GenericWAF is a commercial Web Application Firewall (WAF)."
  website "http://example.com/"

  # Matches #
  matches [

    # HTML socialpage link
    { :module => /<a.*href="https:\/\/www\.(facebook|linkedin|twitter|instagram|tumblr)\.com\/[^"]*">/i },
    { :string => /<a.*href="(https:\/\/www\.(facebook|linkedin|twitter|instagram|tumblr)\.com\/[^"]*)">/i }    
  ]

end
