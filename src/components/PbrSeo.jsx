/// Copyright (c) Pascal Brand
/// MIT License
///
///

import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import logo from '../img/sun.svg'

export default function PbrSEO({ title, description, canonical, addFacebookTag }) {
  return (
    <Helmet>
      { /* Standard metadata tags */}
      { title && <title>{title}</title> }
      { description && <meta name='description' content={description} /> }
      { canonical && <link rel="canonical" href={'https://pascal-brand38.github.io/archives-environnement' + canonical} /> }
      <link rel="icon" type="image/svg+xml" href={logo} />
      { /* End standard metadata tags */}

      { addFacebookTag && <meta property="og:type" content="website" />}
      { addFacebookTag && title && <meta property="og:title" content={title} />}
      { addFacebookTag && description && <meta property="og:description" content={description} />}

      { /* Fix on iPad: phone numbers not written in blue */ }
      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
    </Helmet>
  )
}

PbrSEO.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  canonical: PropTypes.string.isRequired,
  addFacebookTag: PropTypes.bool.isRequired,
}
