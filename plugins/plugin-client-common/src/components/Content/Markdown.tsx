/*
 * Copyright 2020 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react'
import { v4 as uuid } from 'uuid'
import { dirname, join, relative } from 'path'
import * as ReactMarkdown from 'react-markdown'
import { REPL, Tab as KuiTab } from '@kui-shell/core'
import {
  Link,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
  OrderedList,
  UnorderedList,
  ListItem
} from 'carbon-components-react'

import CodeSnippet from '../spi/CodeSnippet'

import 'carbon-components/scss/components/link/_link.scss'
import 'carbon-components/scss/components/copy-button/_copy-button.scss'
import '../../../web/scss/components/List/Carbon.scss'
import '../../../web/scss/components/StructuredList/Carbon.scss'

interface Props {
  tab: KuiTab
  repl: REPL
  source: string

  /** if we have the full path to the source file */
  fullpath?: string
}

export default class Markdown extends React.PureComponent<Props> {
  private readonly _uuid = uuid()

  private onCopy(value: string) {
    navigator.clipboard.writeText(value)
  }

  private anchorFrom(txt: string): string {
    return `${this._uuid}-${txt}`
  }

  public render() {
    return (
      <ReactMarkdown
        source={this.props.source}
        className="padding-content scrollable scrollable-auto marked-content page-content"
        renderers={{
          link: props => {
            const isLocal = !/^http/i.test(props.href)
            const target = !isLocal ? '_blank' : undefined
            const href = isLocal ? '#' : props.href
            const onClick = !isLocal
              ? undefined
              : async () => {
                  let file = props.href
                  if (props.href.startsWith('#kuiexec?command=')) {
                    const cmdline = decodeURIComponent(props.href.slice('#kuiexec?command='.length))
                    if (cmdline) {
                      return this.props.repl.pexec(cmdline)
                    }
                  } else if (props.href.charAt(0) === '#') {
                    const elt = this.props.tab.querySelector(
                      `[data-markdown-anchor="${this.anchorFrom(props.href.slice(1))}"]`
                    )
                    if (elt) {
                      return elt.scrollIntoView()
                    }
                  } else if (this.props.fullpath) {
                    const absoluteHref = join(dirname(this.props.fullpath), props.href)
                    const relativeToCWD = relative(process.cwd() || process.env.PWD, absoluteHref)
                    file = relativeToCWD
                  }
                  return this.props.repl.pexec(`open ${this.props.repl.encodeComponent(file)}`)
                }
            return <Link {...props} href={href} target={target} onClick={onClick} />
          },
          code: props => <CodeSnippet value={props.value} onCopy={this.onCopy.bind(this, props.value)} />,
          heading: props => {
            const valueChild =
              props.children && props.children.length === 1
                ? props.children[0]
                : props.children.find(_ => _.props.value)
            const anchor = !valueChild
              ? undefined
              : this.anchorFrom(valueChild.props.value.toLowerCase().replace(/ /g, '-'))
            return React.createElement(
              `h${props.level}`,
              Object.assign({}, props, { 'data-markdown-anchor': anchor }),
              props.children
            )
          },
          image: props => {
            const isLocal = !/^http/i.test(props.src)
            if (isLocal && this.props.fullpath) {
              const absoluteSrc = join(dirname(this.props.fullpath), props.src)
              const relativeToCWD = relative(process.cwd() || process.env.PWD, absoluteSrc)
              return <img src={relativeToCWD} />
            } else {
              return <img {...props} />
            }
          },
          list: props => {
            return React.createElement(
              props.ordered ? OrderedList : UnorderedList,
              { nested: props.depth > 0, className: props.className },
              props.children
            )
          },
          listItem: props => <ListItem className={props.className}>{props.children}</ListItem>,
          table: props => <StructuredListWrapper className={props.className}>{props.children}</StructuredListWrapper>,
          tableHead: props => <StructuredListHead className={props.className}>{props.children}</StructuredListHead>,
          tableBody: props => <StructuredListBody className={props.className}>{props.children}</StructuredListBody>,
          tableRow: props => (
            <StructuredListRow head={props.isHeader} className={props.className}>
              {props.children}
            </StructuredListRow>
          ),
          tableCell: props => (
            <StructuredListCell head={props.isHeader} className={props.className}>
              {props.children}
            </StructuredListCell>
          )
        }}
      />
    )
  }
}
